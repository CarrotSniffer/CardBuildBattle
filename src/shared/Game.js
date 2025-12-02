const { CARDS, STARTER_DECKS } = require('./cards');

class Game {
    constructor(gameId, player1Id, player2Id) {
        this.id = gameId;
        this.player1Id = player1Id;
        this.player2Id = player2Id;

        // Game configuration
        this.config = {
            startingHealth: 30,
            startingHandSize: 4,
            maxHandSize: 10,
            maxFieldUnits: 6,
            maxMana: 10,
            cardsPerTurn: 1
        };

        // Initialize player states
        this.players = {
            [player1Id]: this.createPlayerState(player1Id),
            [player2Id]: this.createPlayerState(player2Id)
        };

        // Game state
        this.currentTurn = player1Id; // Player 1 goes first (deterministic)
        this.turnNumber = 1;
        this.phase = 'playing'; // 'playing', 'ended'
        this.winner = null;

        // Initialize the game
        this.initializeGame();
    }

    createPlayerState(playerId) {
        return {
            id: playerId,
            health: this.config.startingHealth,
            maxMana: 1,
            currentMana: 1,
            deck: [],
            hand: [],
            field: [], // Units on the battlefield
            structures: [], // Structures on the field
            graveyard: []
        };
    }

    initializeGame() {
        // Both players start with the balanced deck by default
        this.setPlayerDeck(this.player1Id, 'balanced');
        this.setPlayerDeck(this.player2Id, 'balanced');

        // Draw starting hands
        this.drawCards(this.player1Id, this.config.startingHandSize);
        this.drawCards(this.player2Id, this.config.startingHandSize);

        // Player 2 gets a bonus card for going second (balancing)
        this.drawCards(this.player2Id, 1);
    }

    setPlayerDeck(playerId, deckId) {
        const deckTemplate = STARTER_DECKS[deckId];
        if (!deckTemplate) return;

        const player = this.players[playerId];

        // Create deck with unique instance IDs
        player.deck = deckTemplate.cards.map((cardId, index) => ({
            instanceId: `${playerId}-${cardId}-${index}`,
            ...CARDS[cardId]
        }));

        // Shuffle deck deterministically based on game ID and player ID
        // Using a seeded shuffle based on game state
        player.deck = this.deterministicShuffle(player.deck, `${this.id}-${playerId}`);
    }

    // Deterministic shuffle using a simple hash
    deterministicShuffle(array, seed) {
        const shuffled = [...array];
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            hash = ((hash << 5) - hash) + seed.charCodeAt(i);
            hash = hash & hash;
        }

        for (let i = shuffled.length - 1; i > 0; i--) {
            hash = ((hash << 5) - hash) + i;
            hash = hash & hash;
            const j = Math.abs(hash) % (i + 1);
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        return shuffled;
    }

    drawCards(playerId, count) {
        const player = this.players[playerId];
        const drawn = [];

        for (let i = 0; i < count; i++) {
            if (player.deck.length === 0) {
                // No more cards - take fatigue damage
                player.health -= (this.turnNumber);
                continue;
            }

            if (player.hand.length >= this.config.maxHandSize) {
                // Hand is full - discard the drawn card
                const discarded = player.deck.shift();
                player.graveyard.push(discarded);
                continue;
            }

            const card = player.deck.shift();
            player.hand.push(card);
            drawn.push(card);
        }

        return drawn;
    }

    playCard(playerId, cardInstanceId, target) {
        if (this.phase !== 'playing') {
            return { success: false, message: 'Game has ended' };
        }

        if (this.currentTurn !== playerId) {
            return { success: false, message: 'Not your turn' };
        }

        const player = this.players[playerId];
        const cardIndex = player.hand.findIndex(c => c.instanceId === cardInstanceId);

        if (cardIndex === -1) {
            return { success: false, message: 'Card not in hand' };
        }

        const card = player.hand[cardIndex];

        // Check mana cost (apply cost reduction from structures)
        let cost = card.cost;
        if (card.type === 'unit') {
            player.structures.forEach(s => {
                if (s.effect === 'cost_reduction' && s.target === 'unit_cards') {
                    cost = Math.max(0, cost - s.value);
                }
            });
        }

        if (player.currentMana < cost) {
            return { success: false, message: 'Not enough mana' };
        }

        // Validate target if needed
        if (!this.validateTarget(playerId, card, target)) {
            return { success: false, message: 'Invalid target' };
        }

        // Remove card from hand and spend mana
        player.hand.splice(cardIndex, 1);
        player.currentMana -= cost;

        // Execute card effect based on type
        switch (card.type) {
            case 'unit':
                return this.playUnit(playerId, card);
            case 'spell':
                return this.playSpell(playerId, card, target);
            case 'structure':
                return this.playStructure(playerId, card);
            default:
                return { success: false, message: 'Unknown card type' };
        }
    }

    playUnit(playerId, card) {
        const player = this.players[playerId];

        if (player.field.length >= this.config.maxFieldUnits) {
            // Refund the card
            player.hand.push(card);
            player.currentMana += card.cost;
            return { success: false, message: 'Field is full' };
        }

        // Create unit instance
        const unit = {
            ...card,
            currentHealth: card.health,
            currentAttack: card.attack,
            canAttack: card.abilities.includes('swift'),
            buffs: [],
            debuffs: []
        };

        player.field.push(unit);

        return { success: true, message: `Played ${card.name}` };
    }

    playSpell(playerId, card, target) {
        const player = this.players[playerId];
        const opponent = this.getOpponent(playerId);

        // Calculate spell power bonus
        let spellPower = 0;
        player.field.forEach(unit => {
            if (unit.abilities.includes('spellpower')) {
                spellPower += 1;
            }
        });

        switch (card.effect) {
            case 'damage':
                const damage = card.value + spellPower;
                if (target.type === 'unit') {
                    const targetUnit = this.findUnit(target.playerId, target.instanceId);
                    if (targetUnit) {
                        this.dealDamage(targetUnit, damage, target.playerId);
                    }
                } else if (target.type === 'hero') {
                    this.players[target.playerId].health -= damage;
                }
                break;

            case 'heal':
                const healAmount = card.value;
                if (target.type === 'unit') {
                    const targetUnit = this.findUnit(target.playerId, target.instanceId);
                    if (targetUnit) {
                        targetUnit.currentHealth = Math.min(targetUnit.health, targetUnit.currentHealth + healAmount);
                    }
                } else if (target.type === 'hero') {
                    const targetPlayer = this.players[target.playerId];
                    targetPlayer.health = Math.min(this.config.startingHealth, targetPlayer.health + healAmount);
                }
                break;

            case 'buff':
                if (target.type === 'unit') {
                    const targetUnit = this.findUnit(target.playerId, target.instanceId);
                    if (targetUnit) {
                        if (card.value.attack) targetUnit.currentAttack += card.value.attack;
                        if (card.value.health) {
                            targetUnit.health += card.value.health;
                            targetUnit.currentHealth += card.value.health;
                        }
                    }
                }
                break;

            case 'debuff':
                if (target.type === 'unit') {
                    const targetUnit = this.findUnit(target.playerId, target.instanceId);
                    if (targetUnit) {
                        if (card.value.attack) {
                            targetUnit.currentAttack = Math.max(0, targetUnit.currentAttack + card.value.attack);
                        }
                    }
                }
                break;

            case 'draw':
                this.drawCards(playerId, card.value);
                break;

            case 'destroy':
                if (target.type === 'unit') {
                    const targetUnit = this.findUnit(target.playerId, target.instanceId);
                    if (targetUnit && card.condition === 'damaged' && targetUnit.currentHealth < targetUnit.health) {
                        this.destroyUnit(target.playerId, target.instanceId);
                    }
                }
                break;

            case 'grant_ability':
                if (target.type === 'unit') {
                    const targetUnit = this.findUnit(target.playerId, target.instanceId);
                    if (targetUnit && !targetUnit.abilities.includes(card.value)) {
                        targetUnit.abilities.push(card.value);
                    }
                }
                break;

            case 'heal_all':
                player.field.forEach(unit => {
                    unit.currentHealth = Math.min(unit.health, unit.currentHealth + card.value);
                });
                break;
        }

        player.graveyard.push(card);
        this.checkGameEnd();

        return { success: true, message: `Cast ${card.name}` };
    }

    playStructure(playerId, card) {
        const player = this.players[playerId];

        const structure = {
            ...card,
            currentHealth: card.health
        };

        player.structures.push(structure);

        return { success: true, message: `Built ${card.name}` };
    }

    attack(playerId, attackerInstanceId, targetInfo) {
        if (this.currentTurn !== playerId) {
            return { success: false, message: 'Not your turn' };
        }

        const player = this.players[playerId];
        const opponent = this.getOpponent(playerId);
        const opponentPlayer = this.players[opponent];

        const attacker = player.field.find(u => u.instanceId === attackerInstanceId);
        if (!attacker) {
            return { success: false, message: 'Attacker not found' };
        }

        if (!attacker.canAttack) {
            return { success: false, message: 'Unit cannot attack this turn' };
        }

        // Check for taunt
        const tauntUnits = opponentPlayer.field.filter(u => u.abilities.includes('taunt'));
        if (tauntUnits.length > 0 && targetInfo.type !== 'unit') {
            return { success: false, message: 'Must attack a unit with Taunt' };
        }
        if (tauntUnits.length > 0 && targetInfo.type === 'unit') {
            const targetHasTaunt = tauntUnits.some(u => u.instanceId === targetInfo.instanceId);
            if (!targetHasTaunt) {
                return { success: false, message: 'Must attack a unit with Taunt' };
            }
        }

        // Calculate damage (charge doubles it)
        let damage = attacker.currentAttack;
        if (attacker.abilities.includes('charge')) {
            damage *= 2;
        }

        if (targetInfo.type === 'hero') {
            // Attack opponent's hero
            opponentPlayer.health -= damage;
            attacker.canAttack = false;
        } else if (targetInfo.type === 'unit') {
            const target = opponentPlayer.field.find(u => u.instanceId === targetInfo.instanceId);
            if (!target) {
                return { success: false, message: 'Target not found' };
            }

            // Deal damage to target
            this.dealDamage(target, damage, opponent);

            // Counter-attack (unless attacker has ranged)
            if (!attacker.abilities.includes('ranged') && target.currentHealth > 0) {
                this.dealDamage(attacker, target.currentAttack, playerId);
            }

            attacker.canAttack = false;
        } else if (targetInfo.type === 'structure') {
            const target = opponentPlayer.structures.find(s => s.instanceId === targetInfo.instanceId);
            if (!target) {
                return { success: false, message: 'Structure not found' };
            }

            target.currentHealth -= damage;
            if (target.currentHealth <= 0) {
                const idx = opponentPlayer.structures.findIndex(s => s.instanceId === targetInfo.instanceId);
                opponentPlayer.structures.splice(idx, 1);
            }

            attacker.canAttack = false;
        }

        this.checkGameEnd();

        return { success: true, message: 'Attack successful' };
    }

    dealDamage(unit, amount, ownerId) {
        // Check for armor
        if (unit.abilities.includes('armor')) {
            amount = Math.max(0, amount - 1);
        }

        // Check for divine shield
        if (unit.abilities.includes('divine_shield') && amount > 0) {
            const shieldIdx = unit.abilities.indexOf('divine_shield');
            unit.abilities.splice(shieldIdx, 1);
            return; // Damage blocked
        }

        unit.currentHealth -= amount;

        // Check for frenzy
        if (unit.abilities.includes('frenzy') && amount > 0) {
            unit.currentAttack += 1;
        }

        // Check if unit dies
        if (unit.currentHealth <= 0) {
            this.destroyUnit(ownerId, unit.instanceId);
        }
    }

    destroyUnit(ownerId, instanceId) {
        const player = this.players[ownerId];
        const idx = player.field.findIndex(u => u.instanceId === instanceId);
        if (idx !== -1) {
            const unit = player.field.splice(idx, 1)[0];
            player.graveyard.push(unit);
        }
    }

    findUnit(playerId, instanceId) {
        const player = this.players[playerId];
        return player.field.find(u => u.instanceId === instanceId);
    }

    validateTarget(playerId, card, target) {
        if (!card.target || card.target === 'self') {
            return true;
        }

        if (!target) {
            return card.target === 'self' || card.target === 'all_friendly' || card.target === 'all_enemies';
        }

        const opponent = this.getOpponent(playerId);

        switch (card.target) {
            case 'enemy_unit':
                return target.type === 'unit' && target.playerId === opponent;
            case 'friendly_unit':
                return target.type === 'unit' && target.playerId === playerId;
            case 'friendly':
                return target.playerId === playerId;
            case 'any_unit':
                return target.type === 'unit';
            default:
                return true;
        }
    }

    endTurn(playerId) {
        if (this.currentTurn !== playerId) {
            return { success: false, message: 'Not your turn' };
        }

        // Process end of turn effects
        this.processEndOfTurnEffects(playerId);

        // Switch turns
        this.currentTurn = this.getOpponent(playerId);

        // If it's now player 1's turn, increment turn number
        if (this.currentTurn === this.player1Id) {
            this.turnNumber++;
        }

        // Start of turn for next player
        const nextPlayer = this.players[this.currentTurn];

        // Increase max mana (up to 10)
        nextPlayer.maxMana = Math.min(this.config.maxMana, nextPlayer.maxMana + 1);
        nextPlayer.currentMana = nextPlayer.maxMana;

        // Draw a card
        this.drawCards(this.currentTurn, this.config.cardsPerTurn);

        // Reset unit attacks
        nextPlayer.field.forEach(unit => {
            unit.canAttack = true;
        });

        this.checkGameEnd();

        return { success: true, message: 'Turn ended' };
    }

    processEndOfTurnEffects(playerId) {
        const player = this.players[playerId];
        const opponent = this.getOpponent(playerId);
        const opponentPlayer = this.players[opponent];

        // Structure effects
        player.structures.forEach(structure => {
            switch (structure.effect) {
                case 'end_turn_damage':
                    opponentPlayer.field.forEach(unit => {
                        this.dealDamage(unit, structure.value, opponent);
                    });
                    break;
                case 'end_turn_heal':
                    player.field.forEach(unit => {
                        unit.currentHealth = Math.min(unit.health, unit.currentHealth + structure.value);
                    });
                    break;
            }
        });

        // Unit abilities
        player.field.forEach((unit, index) => {
            if (unit.abilities.includes('heal_ally')) {
                // Heal adjacent allies
                const leftAlly = player.field[index - 1];
                const rightAlly = player.field[index + 1];
                if (leftAlly) {
                    leftAlly.currentHealth = Math.min(leftAlly.health, leftAlly.currentHealth + 2);
                }
                if (rightAlly) {
                    rightAlly.currentHealth = Math.min(rightAlly.health, rightAlly.currentHealth + 2);
                }
            }
        });

        // Apply inspire buff (recalculate each turn)
        player.field.forEach((unit, index) => {
            if (unit.abilities.includes('inspire')) {
                const leftAlly = player.field[index - 1];
                const rightAlly = player.field[index + 1];
                if (leftAlly && !leftAlly.inspireBuffed) {
                    leftAlly.currentAttack += 1;
                    leftAlly.currentHealth += 1;
                    leftAlly.health += 1;
                    leftAlly.inspireBuffed = true;
                }
                if (rightAlly && !rightAlly.inspireBuffed) {
                    rightAlly.currentAttack += 1;
                    rightAlly.currentHealth += 1;
                    rightAlly.health += 1;
                    rightAlly.inspireBuffed = true;
                }
            }
        });
    }

    getOpponent(playerId) {
        return playerId === this.player1Id ? this.player2Id : this.player1Id;
    }

    checkGameEnd() {
        const p1Health = this.players[this.player1Id].health;
        const p2Health = this.players[this.player2Id].health;

        if (p1Health <= 0 && p2Health <= 0) {
            this.phase = 'ended';
            this.winner = 'draw';
        } else if (p1Health <= 0) {
            this.phase = 'ended';
            this.winner = this.player2Id;
        } else if (p2Health <= 0) {
            this.phase = 'ended';
            this.winner = this.player1Id;
        }
    }

    selectDeck(playerId, deckId) {
        if (STARTER_DECKS[deckId]) {
            this.setPlayerDeck(playerId, deckId);
        }
    }

    getStateForPlayer(playerId) {
        const opponent = this.getOpponent(playerId);
        const playerState = this.players[playerId];
        const opponentState = this.players[opponent];

        return {
            gameId: this.id,
            phase: this.phase,
            winner: this.winner,
            isYourTurn: this.currentTurn === playerId,
            turnNumber: this.turnNumber,
            you: {
                id: playerId,
                health: playerState.health,
                maxMana: playerState.maxMana,
                currentMana: playerState.currentMana,
                hand: playerState.hand,
                field: playerState.field,
                structures: playerState.structures,
                deckCount: playerState.deck.length,
                graveyardCount: playerState.graveyard.length
            },
            opponent: {
                id: opponent,
                health: opponentState.health,
                maxMana: opponentState.maxMana,
                currentMana: opponentState.currentMana,
                handCount: opponentState.hand.length,
                field: opponentState.field,
                structures: opponentState.structures,
                deckCount: opponentState.deck.length,
                graveyardCount: opponentState.graveyard.length
            }
        };
    }

    handleDisconnect(playerId) {
        this.phase = 'ended';
        this.winner = this.getOpponent(playerId);
    }
}

module.exports = Game;
