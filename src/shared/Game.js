/**
 * Game Logic - Handles all game mechanics and state
 *
 * MANA SYSTEM:
 * - Base mana is tied to turn number (both players share same base)
 * - Turn 1 = 1 base mana, Turn 2 = 2 base mana, etc. up to 10
 * - Each player has a separate land pool (not in deck) with 7 lands
 * - Lands can be played anytime for 1 mana from the pool
 * - Each land ON THE FIELD adds +1 to max mana
 * - Max possible mana: 10 base + 7 lands on field = 17 total
 * - Lands have 5 health and can be attacked/destroyed
 *
 * TRAIT EFFECTS (from pointSystem.js):
 * POSITIVE:
 * - swift: Can attack immediately when played
 * - taunt: Enemies must attack this unit first
 * - ranged: Attacks without receiving counter-damage
 * - armor: Takes 1 less damage from all sources
 * - charge: Deals DOUBLE damage when attacking
 * - lifesteal: Heals your hero for damage dealt
 * - divine_shield: Blocks the first instance of damage
 * - inspire: Adjacent allies gain +1/+1
 * - regenerate: Heals 1 health at the start of your turn
 * - piercing: Excess damage hits the enemy hero
 * - stealth: Cannot be targeted until it attacks
 * - deathtouch: Destroys any unit it damages
 * - frenzy: Can attack twice per turn
 * - thorns: Deals 1 damage to attackers
 * - rally: All allies gain +1 attack when played
 * - guardian: Adjacent allies take 1 less damage
 * - vampiric: Gains +1/+1 when it kills a unit
 * - retaliate: Deals double counter-attack damage
 * - elusive: Can only be blocked by units with 3+ attack (ignore taunt from weaker units)
 * - leech: Drains 1 mana from opponent when attacking hero
 * - undying: Returns to hand when destroyed (once)
 * - overpower: Ignores armor trait
 * - warcry: Gains +2 attack on the turn it is played
 *
 * NEGATIVE:
 * - frail: Dies to ANY damage (1 damage = death)
 * - slow: Cannot attack for 1 turn after playing
 * - fragile: Takes DOUBLE damage
 * - costly: Costs +2 additional mana (applied in card creation)
 * - exhausting: Lose 2 mana next turn
 * - soulbound: When this dies, lose 3 health
 * - volatile: Dies at the end of your turn
 * - pacifist: Cannot attack heroes directly (can attack units)
 * - cursed: Cannot be healed or buffed
 * - clumsy: Has a 25% chance to miss attacks
 * - cowardly: Cannot attack units with higher attack
 * - reckless: Must attack each turn if able (auto-attacks random target)
 * - doomed: Dies after 3 turns on field
 * - vengeful: Deals 2 damage to your hero when destroyed
 * - exposed: Takes +1 damage from all sources
 * - draining: Costs 1 mana each turn to keep alive (dies if can't pay)
 * - disloyal: Switches sides if opponent has more units
 * - brittle: Loses 1 attack each turn (min 0)
 */

class Game {
    constructor(gameId, player1Id, player2Id, player1Deck = null, player2Deck = null, player1Name = 'Player 1', player2Name = 'Player 2') {
        this.id = gameId;
        this.player1Id = player1Id;
        this.player2Id = player2Id;
        this.player1Name = player1Name;
        this.player2Name = player2Name;

        // Game configuration
        this.config = {
            startingHealth: 30,
            startingHandSize: 5,     // Changed to 5 cards
            targetHandSize: 5,       // Always try to have 5 cards in hand
            maxHandSize: 10,
            maxFieldUnits: 6,
            baseManaMax: 10,        // Natural mana cap without lands (grows each turn)
            maxMana: 17,            // Absolute maximum mana (10 base + 7 lands)
            cardsPerTurn: 1,        // Not used in new mechanic - player chooses how many to cycle
            landCost: 1,            // Mana cost to play a land
            landHealth: 5,          // Health for lands
            landPoolSize: 7         // Number of lands in each player's pool
        };

        // Card selection state (for end of turn)
        this.pendingCardSelection = null; // { playerId, cardsToSelect: [] }

        // Custom decks
        this.player1Deck = player1Deck;
        this.player2Deck = player2Deck;

        // Initialize player states
        this.players = {
            [player1Id]: this.createPlayerState(player1Id, player1Name),
            [player2Id]: this.createPlayerState(player2Id, player2Name)
        };

        // Game state
        this.currentTurn = player1Id;
        this.turnNumber = 1;
        this.phase = 'playing';
        this.winner = null;

        // Event log
        this.events = [];
        this.lastEvent = null; // For animation purposes

        // Initialize
        this.initializeGame();
    }

    addEvent(type, data) {
        this.events.push({
            turn: this.turnNumber,
            type,
            timestamp: Date.now(),
            ...data
        });
        if (this.events.length > 50) {
            this.events.shift();
        }
    }

    createPlayerState(playerId, playerName) {
        return {
            id: playerId,
            name: playerName,
            health: this.config.startingHealth,
            currentMana: 1,         // Start with 1 mana (no lands on field yet)
            deck: [],
            hand: [],
            field: [],              // Units on the battlefield
            lands: [],              // Lands ON THE FIELD
            landPool: this.config.landPoolSize, // Available lands to play (separate from deck)
            graveyard: [],
            exhaustingPenalty: 0    // Mana penalty from exhausting trait
        };
    }

    // Base mana is determined by turn number (same for both players)
    // Turn 1 = 1 mana, Turn 2 = 2 mana, etc. up to baseManaMax (5)
    getBaseMana() {
        return Math.min(this.config.baseManaMax, this.turnNumber);
    }

    // Max mana = base mana + lands on field
    getMaxMana(playerId) {
        const player = this.players[playerId];
        const baseMana = this.getBaseMana();
        const landBonus = player.lands.length;
        return Math.min(this.config.maxMana, baseMana + landBonus);
    }

    initializeGame() {
        // Set up player decks with land cards mixed in
        if (this.player1Deck && this.player1Deck.length > 0) {
            this.setCustomDeck(this.player1Id, this.player1Deck);
        }
        if (this.player2Deck && this.player2Deck.length > 0) {
            this.setCustomDeck(this.player2Id, this.player2Deck);
        }

        // Draw starting hands
        this.drawCards(this.player1Id, this.config.startingHandSize);
        this.drawCards(this.player2Id, this.config.startingHandSize);

        // Player 2 gets a bonus card for going second
        this.drawCards(this.player2Id, 1);

        this.addEvent('game_start', {
            player1: this.player1Name,
            player2: this.player2Name
        });
    }

    setCustomDeck(playerId, deckCards) {
        const player = this.players[playerId];

        // Create deck from custom cards (NO lands - they're in a separate pool now)
        const cardDeck = deckCards.map((card, index) => ({
            instanceId: `${playerId}-card-${card.id}-${index}`,
            id: card.id,
            name: card.name,
            type: 'unit',
            cost: this.getEffectiveManaCost(card),
            attack: card.attack,
            health: card.health,
            abilities: card.traits || [],
            traits: card.traits || []
        }));

        // Shuffle deck (lands are now in separate pool, not in deck)
        player.deck = this.deterministicShuffle(cardDeck, `${this.id}-${playerId}`);
    }

    getEffectiveManaCost(card) {
        let cost = card.manaCost;
        if (card.traits && card.traits.includes('costly')) {
            cost += 2;
        }
        return cost;
    }

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
                const fatigueDamage = this.turnNumber;
                player.health -= fatigueDamage;
                this.addEvent('fatigue', { playerId, damage: fatigueDamage });
                continue;
            }

            if (player.hand.length >= this.config.maxHandSize) {
                const discarded = player.deck.shift();
                player.graveyard.push(discarded);
                this.addEvent('card_discarded', { playerId, cardName: discarded.name });
                continue;
            }

            const card = player.deck.shift();
            player.hand.push(card);
            drawn.push(card);
        }

        return drawn;
    }

    playCard(playerId, cardInstanceId, target, position = null) {
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
        const cost = card.cost;

        if (player.currentMana < cost) {
            return { success: false, message: 'Not enough mana' };
        }

        // Handle unit cards (lands are played via playLandFromPool now)
        return this.playUnitCard(playerId, cardIndex, target, position);
    }

    // Play a land from the player's land pool (separate from deck/hand)
    playLandFromPool(playerId) {
        if (this.phase !== 'playing') {
            return { success: false, message: 'Game has ended' };
        }

        if (this.currentTurn !== playerId) {
            return { success: false, message: 'Not your turn' };
        }

        const player = this.players[playerId];

        if (player.landPool <= 0) {
            return { success: false, message: 'No lands remaining in pool' };
        }

        if (player.currentMana < this.config.landCost) {
            return { success: false, message: 'Not enough mana' };
        }

        // Pay cost and decrement pool
        player.currentMana -= this.config.landCost;
        player.landPool--;

        // Create and add land to field
        const landIndex = this.config.landPoolSize - player.landPool - 1;
        const land = {
            instanceId: `${playerId}-land-${landIndex}-${Date.now()}`,
            name: 'Mana Land',
            health: this.config.landHealth,
            currentHealth: this.config.landHealth
        };

        player.lands.push(land);
        this.addEvent('land_played', { playerId });

        return { success: true, message: 'Mana Land played' };
    }

    playUnitCard(playerId, cardIndex, target, position = null) {
        const player = this.players[playerId];
        const card = player.hand[cardIndex];

        if (player.field.length >= this.config.maxFieldUnits) {
            return { success: false, message: 'Field is full (max 6 units)' };
        }

        // Remove from hand and pay cost
        player.hand.splice(cardIndex, 1);
        player.currentMana -= card.cost;

        // Check for exhausting trait - lose 2 mana next turn
        if (card.abilities && card.abilities.includes('exhausting')) {
            player.exhaustingPenalty = (player.exhaustingPenalty || 0) + 2;
        }

        // Create unit instance
        const unit = {
            ...card,
            currentHealth: card.health,
            currentAttack: card.attack,
            canAttack: card.abilities && card.abilities.includes('swift'),
            hasAttackedThisTurn: false,
            attacksThisTurn: 0, // Track number of attacks for frenzy
            turnsOnField: 0,
            hasStealthActive: card.abilities && card.abilities.includes('stealth'), // Stealth is active until first attack
            hasUndyingActive: card.abilities && card.abilities.includes('undying'), // Undying can only trigger once
            doomedTurns: card.abilities && card.abilities.includes('doomed') ? 3 : 0 // Doomed countdown
        };

        // Apply slow - needs extra turn before attacking
        if (card.abilities && card.abilities.includes('slow')) {
            unit.slowTurnsRemaining = 1;
            unit.canAttack = false;
        }

        // WARCRY: Gains +2 attack on the turn it is played
        if (card.abilities && card.abilities.includes('warcry')) {
            unit.currentAttack += 2;
            unit.warcryBonus = 2; // Track bonus to remove at end of turn
            this.addEvent('warcry', { unitName: unit.name });
        }

        // Insert at specified position or append at end
        if (position !== null && position >= 0 && position <= player.field.length) {
            player.field.splice(position, 0, unit);
        } else {
            player.field.push(unit);
        }

        // RALLY: All allies gain +1 attack when played (after unit is placed)
        if (card.abilities && card.abilities.includes('rally')) {
            player.field.forEach(ally => {
                if (ally.instanceId !== unit.instanceId && !(ally.abilities && ally.abilities.includes('cursed'))) {
                    ally.currentAttack += 1;
                }
            });
            this.addEvent('rally', { unitName: unit.name });
        }

        this.addEvent('unit_played', {
            playerId,
            cardName: card.name,
            attack: unit.currentAttack,
            health: unit.currentHealth
        });

        return { success: true, message: `Played ${card.name}` };
    }

    // Play land from the pool (called by client/server)
    playLand(playerId) {
        return this.playLandFromPool(playerId);
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

        // FRENZY: Can attack twice per turn
        const maxAttacks = (attacker.abilities && attacker.abilities.includes('frenzy')) ? 2 : 1;
        if (attacker.attacksThisTurn >= maxAttacks) {
            return { success: false, message: 'Unit has already attacked' };
        }

        // PACIFIST: Cannot attack heroes or lands (can only attack units)
        if (attacker.abilities && attacker.abilities.includes('pacifist')) {
            if (targetInfo.type === 'hero') {
                return { success: false, message: 'Pacifist: Cannot attack heroes' };
            }
            if (targetInfo.type === 'land') {
                return { success: false, message: 'Pacifist: Can only attack units' };
            }
        }

        // COWARDLY: Cannot attack units with higher attack
        if (attacker.abilities && attacker.abilities.includes('cowardly') && targetInfo.type === 'unit') {
            const targetUnit = opponentPlayer.field.find(u => u.instanceId === targetInfo.instanceId);
            if (targetUnit && targetUnit.currentAttack > attacker.currentAttack) {
                return { success: false, message: 'Cowardly: Cannot attack stronger units' };
            }
        }

        // Check for taunt (stealth units with taunt don't force attacks until revealed)
        // ELUSIVE: Can ignore taunt from units with less than 3 attack
        const isElusive = attacker.abilities && attacker.abilities.includes('elusive');
        const tauntUnits = opponentPlayer.field.filter(u =>
            u.abilities && u.abilities.includes('taunt') && !u.hasStealthActive &&
            (!isElusive || u.currentAttack >= 3) // Elusive ignores weak taunts
        );
        if (tauntUnits.length > 0) {
            if (targetInfo.type !== 'unit') {
                return { success: false, message: 'Must attack a unit with Taunt' };
            }
            const targetHasTaunt = tauntUnits.some(u => u.instanceId === targetInfo.instanceId);
            if (!targetHasTaunt) {
                return { success: false, message: 'Must attack a unit with Taunt' };
            }
        }

        // STEALTH: Cannot target stealthed units
        if (targetInfo.type === 'unit') {
            const targetUnit = opponentPlayer.field.find(u => u.instanceId === targetInfo.instanceId);
            if (targetUnit && targetUnit.hasStealthActive) {
                return { success: false, message: 'Cannot target a unit with Stealth' };
            }
        }

        // Calculate base damage
        let damage = attacker.currentAttack;

        // CHARGE: Deals DOUBLE damage when attacking
        if (attacker.abilities && attacker.abilities.includes('charge')) {
            damage *= 2;
        }

        // CLUMSY: 25% chance to miss attacks
        if (attacker.abilities && attacker.abilities.includes('clumsy')) {
            if (Math.random() < 0.25) {
                // Break stealth even on miss
                if (attacker.hasStealthActive) {
                    attacker.hasStealthActive = false;
                }
                attacker.attacksThisTurn = (attacker.attacksThisTurn || 0) + 1;
                attacker.hasAttackedThisTurn = true;
                const maxAttacks = (attacker.abilities && attacker.abilities.includes('frenzy')) ? 2 : 1;
                attacker.canAttack = attacker.attacksThisTurn < maxAttacks;
                this.addEvent('clumsy_miss', { unitName: attacker.name });
                return { success: true, message: `${attacker.name} missed! (Clumsy)` };
            }
        }

        if (targetInfo.type === 'hero') {
            opponentPlayer.health -= damage;

            // LIFESTEAL
            if (attacker.abilities && attacker.abilities.includes('lifesteal')) {
                player.health = Math.min(this.config.startingHealth, player.health + damage);
                this.addEvent('lifesteal', { playerId, amount: damage });
            }

            // LEECH: Drain 1 mana from opponent when attacking hero
            if (attacker.abilities && attacker.abilities.includes('leech')) {
                opponentPlayer.currentMana = Math.max(0, opponentPlayer.currentMana - 1);
                this.addEvent('leech', { unitName: attacker.name });
            }

            // Break stealth when attacking
            if (attacker.hasStealthActive) {
                attacker.hasStealthActive = false;
                this.addEvent('stealth_broken', { unitName: attacker.name });
            }

            // Update attack tracking (frenzy allows 2 attacks)
            attacker.attacksThisTurn = (attacker.attacksThisTurn || 0) + 1;
            attacker.hasAttackedThisTurn = true;
            const maxAttacks = (attacker.abilities && attacker.abilities.includes('frenzy')) ? 2 : 1;
            attacker.canAttack = attacker.attacksThisTurn < maxAttacks;

            // Store event for animation
            this.lastEvent = {
                type: 'attack_hero',
                attackerId: attackerInstanceId,
                attackerName: attacker.name,
                targetType: 'hero',
                targetPlayerId: opponent,
                targetId: null,
                damage,
                timestamp: Date.now()
            };

            this.addEvent('attack_hero', {
                attackerId: playerId,
                attackerName: attacker.name,
                damage
            });
        } else if (targetInfo.type === 'unit') {
            const target = opponentPlayer.field.find(u => u.instanceId === targetInfo.instanceId);
            if (!target) {
                return { success: false, message: 'Target not found' };
            }

            // PIERCING: Excess damage goes to hero
            let piercingDamage = 0;
            if (attacker.abilities && attacker.abilities.includes('piercing')) {
                piercingDamage = Math.max(0, damage - target.currentHealth);
            }

            // Track deaths for animation
            const deaths = [];
            const targetHealthBefore = target.currentHealth;
            const attackerHealthBefore = attacker.currentHealth;

            // Deal damage to target (pass attacker for overpower check)
            this.dealDamage(target, damage, opponent, playerId, attacker);

            // DEATHTOUCH: If attacker has deathtouch and dealt any damage, destroy target
            if (attacker.abilities && attacker.abilities.includes('deathtouch') && damage > 0) {
                const targetStillExists = opponentPlayer.field.find(u => u.instanceId === targetInfo.instanceId);
                if (targetStillExists && targetStillExists.currentHealth > 0) {
                    this.destroyUnit(opponent, targetInfo.instanceId);
                    this.addEvent('deathtouch_kill', { attackerName: attacker.name, targetName: target.name });
                }
            }

            // Check if target died
            const targetDied = !opponentPlayer.field.find(u => u.instanceId === targetInfo.instanceId);
            if (targetDied) {
                deaths.push({
                    instanceId: targetInfo.instanceId,
                    name: target.name,
                    ownerId: opponent
                });

                // VAMPIRIC: Gains +1/+1 when it kills a unit
                const attackerStillAlive = player.field.find(u => u.instanceId === attackerInstanceId);
                if (attackerStillAlive && attacker.abilities && attacker.abilities.includes('vampiric')) {
                    if (!(attackerStillAlive.abilities && attackerStillAlive.abilities.includes('cursed'))) {
                        attackerStillAlive.currentAttack += 1;
                        attackerStillAlive.currentHealth += 1;
                        attackerStillAlive.health += 1;
                        this.addEvent('vampiric', { unitName: attacker.name });
                    }
                }
            }

            // Apply piercing
            if (piercingDamage > 0) {
                opponentPlayer.health -= piercingDamage;
                this.addEvent('piercing_damage', { damage: piercingDamage });
            }

            // LIFESTEAL
            if (attacker.abilities && attacker.abilities.includes('lifesteal')) {
                const actualDamage = Math.min(damage, targetHealthBefore);
                player.health = Math.min(this.config.startingHealth, player.health + actualDamage);
                this.addEvent('lifesteal', { playerId, amount: actualDamage });
            }

            // THORNS: Target deals 1 damage back to attacker when attacked (before counter-attack)
            if (target.abilities && target.abilities.includes('thorns')) {
                const attackerCheck = player.field.find(u => u.instanceId === attackerInstanceId);
                if (attackerCheck) {
                    this.dealDamage(attackerCheck, 1, playerId, opponent);
                    this.addEvent('thorns', { targetName: target.name, attackerName: attacker.name });
                }
            }

            // Counter-attack (unless RANGED)
            let counterDamage = 0;
            if (!(attacker.abilities && attacker.abilities.includes('ranged'))) {
                const targetStillAlive = opponentPlayer.field.find(u => u.instanceId === targetInfo.instanceId);
                if (targetStillAlive) {
                    counterDamage = targetStillAlive.currentAttack;

                    // RETALIATE: Deals double counter-attack damage
                    if (targetStillAlive.abilities && targetStillAlive.abilities.includes('retaliate')) {
                        counterDamage *= 2;
                    }

                    this.dealDamage(attacker, counterDamage, playerId, opponent);

                    // DEATHTOUCH: If target has deathtouch and dealt any counter damage, destroy attacker
                    if (targetStillAlive.abilities && targetStillAlive.abilities.includes('deathtouch') && counterDamage > 0) {
                        const attackerStillExists = player.field.find(u => u.instanceId === attackerInstanceId);
                        if (attackerStillExists && attackerStillExists.currentHealth > 0) {
                            this.destroyUnit(playerId, attackerInstanceId);
                            this.addEvent('deathtouch_kill', { attackerName: target.name, targetName: attacker.name });
                        }
                    }

                    // VAMPIRIC for defender: If target kills attacker
                    const attackerDied = !player.field.find(u => u.instanceId === attackerInstanceId);
                    if (attackerDied) {
                        deaths.push({
                            instanceId: attackerInstanceId,
                            name: attacker.name,
                            ownerId: playerId
                        });

                        // Defender vampiric
                        if (targetStillAlive.abilities && targetStillAlive.abilities.includes('vampiric')) {
                            if (!(targetStillAlive.abilities && targetStillAlive.abilities.includes('cursed'))) {
                                targetStillAlive.currentAttack += 1;
                                targetStillAlive.currentHealth += 1;
                                targetStillAlive.health += 1;
                                this.addEvent('vampiric', { unitName: target.name });
                            }
                        }
                    }
                }
            }

            // Break stealth when attacking
            if (attacker.hasStealthActive) {
                attacker.hasStealthActive = false;
                this.addEvent('stealth_broken', { unitName: attacker.name });
            }

            // Update attack tracking (frenzy allows 2 attacks)
            attacker.attacksThisTurn = (attacker.attacksThisTurn || 0) + 1;
            attacker.hasAttackedThisTurn = true;
            const maxAttacksUnit = (attacker.abilities && attacker.abilities.includes('frenzy')) ? 2 : 1;
            attacker.canAttack = attacker.attacksThisTurn < maxAttacksUnit;

            // Store event for animation
            this.lastEvent = {
                type: 'attack_unit',
                attackerId: attackerInstanceId,
                attackerName: attacker.name,
                targetType: 'unit',
                targetId: targetInfo.instanceId,
                targetName: target.name,
                targetPlayerId: opponent,
                damage,
                counterDamage,
                deaths, // Array of units that died
                timestamp: Date.now()
            };

            this.addEvent('attack_unit', {
                attackerId: playerId,
                attackerName: attacker.name,
                targetName: target.name,
                damage
            });
        } else if (targetInfo.type === 'land') {
            const target = opponentPlayer.lands.find(l => l.instanceId === targetInfo.instanceId);
            if (!target) {
                return { success: false, message: 'Land not found' };
            }

            target.currentHealth -= damage;
            if (target.currentHealth <= 0) {
                this.destroyLand(opponent, targetInfo.instanceId);
            }

            // Break stealth when attacking
            if (attacker.hasStealthActive) {
                attacker.hasStealthActive = false;
                this.addEvent('stealth_broken', { unitName: attacker.name });
            }

            // Update attack tracking (frenzy allows 2 attacks)
            attacker.attacksThisTurn = (attacker.attacksThisTurn || 0) + 1;
            attacker.hasAttackedThisTurn = true;
            const maxAttacksLand = (attacker.abilities && attacker.abilities.includes('frenzy')) ? 2 : 1;
            attacker.canAttack = attacker.attacksThisTurn < maxAttacksLand;

            // Store event for animation
            this.lastEvent = {
                type: 'attack_land',
                attackerId: attackerInstanceId,
                attackerName: attacker.name,
                targetType: 'land',
                targetId: targetInfo.instanceId,
                targetPlayerId: opponent,
                damage,
                timestamp: Date.now()
            };

            this.addEvent('attack_land', {
                attackerId: playerId,
                attackerName: attacker.name,
                damage
            });
        }

        this.checkGameEnd();
        return { success: true, message: 'Attack successful', lastEvent: this.lastEvent };
    }

    clearLastEvent() {
        this.lastEvent = null;
    }

    dealDamage(unit, amount, ownerId, sourcePlayerId = null, attackerUnit = null) {
        // EXPOSED: Takes +1 damage from all sources
        if (unit.abilities && unit.abilities.includes('exposed')) {
            amount += 1;
        }

        // FRAGILE: Takes DOUBLE damage
        if (unit.abilities && unit.abilities.includes('fragile')) {
            amount *= 2;
        }

        // GUARDIAN: Check if adjacent allies have guardian (reduce damage by 1)
        const player = this.players[ownerId];
        if (player) {
            const unitIndex = player.field.findIndex(u => u.instanceId === unit.instanceId);
            if (unitIndex !== -1) {
                // Check left and right neighbors for guardian
                const leftNeighbor = unitIndex > 0 ? player.field[unitIndex - 1] : null;
                const rightNeighbor = unitIndex < player.field.length - 1 ? player.field[unitIndex + 1] : null;

                const hasGuardianNeighbor =
                    (leftNeighbor && leftNeighbor.abilities && leftNeighbor.abilities.includes('guardian')) ||
                    (rightNeighbor && rightNeighbor.abilities && rightNeighbor.abilities.includes('guardian'));

                if (hasGuardianNeighbor) {
                    amount = Math.max(0, amount - 1);
                }
            }
        }

        // ARMOR: Takes 1 less damage (can be bypassed by OVERPOWER)
        if (unit.abilities && unit.abilities.includes('armor')) {
            const attackerHasOverpower = attackerUnit && attackerUnit.abilities && attackerUnit.abilities.includes('overpower');
            if (!attackerHasOverpower) {
                amount = Math.max(0, amount - 1);
            }
        }

        // DIVINE SHIELD: Blocks first damage
        if (unit.abilities && unit.abilities.includes('divine_shield') && amount > 0) {
            const idx = unit.abilities.indexOf('divine_shield');
            unit.abilities.splice(idx, 1);
            this.addEvent('divine_shield_broken', { unitName: unit.name });
            return;
        }

        // FRAIL: Dies to ANY damage
        if (unit.abilities && unit.abilities.includes('frail') && amount > 0) {
            unit.currentHealth = 0;
        } else {
            unit.currentHealth -= amount;
        }

        if (unit.currentHealth <= 0) {
            this.destroyUnit(ownerId, unit.instanceId);
        }
    }

    destroyUnit(ownerId, instanceId) {
        const player = this.players[ownerId];
        const idx = player.field.findIndex(u => u.instanceId === instanceId);
        if (idx !== -1) {
            const unit = player.field.splice(idx, 1)[0];

            // UNDYING: Returns to hand when destroyed (once)
            if (unit.hasUndyingActive) {
                unit.hasUndyingActive = false;
                // Reset unit stats when returning to hand
                unit.currentHealth = unit.health;
                unit.currentAttack = unit.attack;
                unit.canAttack = false;
                unit.hasAttackedThisTurn = false;
                unit.attacksThisTurn = 0;
                unit.turnsOnField = 0;
                player.hand.push(unit);
                this.addEvent('undying', { unitName: unit.name });
                return; // Don't continue to graveyard or other death effects
            }

            player.graveyard.push(unit);

            this.addEvent('unit_destroyed', {
                ownerId,
                unitName: unit.name
            });

            // SOULBOUND: Lose 3 health when this dies
            if (unit.abilities && unit.abilities.includes('soulbound')) {
                player.health -= 3;
                this.addEvent('soulbound_damage', { ownerId, damage: 3 });
                this.checkGameEnd();
            }

            // VENGEFUL: Deals 2 damage to your hero when destroyed
            if (unit.abilities && unit.abilities.includes('vengeful')) {
                player.health -= 2;
                this.addEvent('vengeful_damage', { ownerId, unitName: unit.name, damage: 2 });
                this.checkGameEnd();
            }
        }
    }

    destroyLand(ownerId, instanceId) {
        const player = this.players[ownerId];
        const idx = player.lands.findIndex(l => l.instanceId === instanceId);
        if (idx !== -1) {
            player.lands.splice(idx, 1);
            this.addEvent('land_destroyed', { ownerId });
        }
    }

    endTurn(playerId) {
        if (this.currentTurn !== playerId) {
            return { success: false, message: 'Not your turn' };
        }

        // If we're in card selection phase, don't allow ending turn again
        if (this.pendingCardSelection && this.pendingCardSelection.playerId === playerId) {
            return { success: false, message: 'Please select cards to shuffle back first' };
        }

        // RECKLESS: Check if any reckless units haven't attacked yet
        const player = this.players[playerId];
        const recklessUnits = player.field.filter(unit =>
            unit.abilities && unit.abilities.includes('reckless') &&
            unit.canAttack && !unit.hasAttackedThisTurn
        );
        if (recklessUnits.length > 0) {
            const unitNames = recklessUnits.map(u => u.name).join(', ');
            return { success: false, message: `Reckless units must attack: ${unitNames}` };
        }

        // Process end of turn effects
        this.processEndOfTurnEffects(playerId);

        // Check if player has cards in hand - if so, enter card selection phase
        if (player.hand.length > 0) {
            // Enter card selection phase
            this.pendingCardSelection = {
                playerId: playerId,
                phase: 'card_selection'
            };
            this.addEvent('card_selection_start', { playerId });
            return { success: true, message: 'Select cards to shuffle back', cardSelection: true };
        }

        // If no cards in hand, proceed directly
        return this.completeEndTurn(playerId);
    }

    // Called when player confirms their card selection (or has no cards)
    confirmCardSelection(playerId, selectedCardIds = []) {
        if (!this.pendingCardSelection || this.pendingCardSelection.playerId !== playerId) {
            return { success: false, message: 'Not in card selection phase' };
        }

        const player = this.players[playerId];

        // Validate all selected cards are in hand
        const validCards = selectedCardIds.filter(id =>
            player.hand.some(c => c.instanceId === id)
        );

        // Get the actual card data for the discarded cards (for animation)
        const discardedCards = [];

        // Shuffle selected cards back into deck
        if (validCards.length > 0) {
            validCards.forEach(cardId => {
                const cardIndex = player.hand.findIndex(c => c.instanceId === cardId);
                if (cardIndex !== -1) {
                    const card = player.hand.splice(cardIndex, 1)[0];
                    discardedCards.push({ ...card }); // Copy for animation
                    player.deck.push(card);
                }
            });

            // Shuffle deck
            player.deck = this.shuffleDeck(player.deck);

            this.addEvent('cards_shuffled_back', {
                playerId,
                count: validCards.length
            });
        }

        // Draw cards equal to what was discarded (immediately, not on next turn)
        const drawnCards = [];
        if (validCards.length > 0) {
            const drawn = this.drawCards(playerId, validCards.length);
            drawnCards.push(...drawn);
        }

        // Clear pending selection
        this.pendingCardSelection = null;

        // Store cycling event for animation
        this.lastEvent = {
            type: 'card_cycle',
            playerId,
            discardedCards,
            drawnCards,
            timestamp: Date.now()
        };

        // Complete the turn end
        const result = this.completeEndTurn(playerId, validCards.length);
        return {
            ...result,
            cycleAnimation: {
                discardedCards,
                drawnCards
            }
        };
    }

    // Skip card selection (keep all cards)
    skipCardSelection(playerId) {
        return this.confirmCardSelection(playerId, []);
    }

    // Complete the turn transition
    completeEndTurn(playerId, cardsShuffled = 0) {
        // Switch turns
        this.currentTurn = this.getOpponent(playerId);

        // Increment turn number when it goes back to player 1
        if (this.currentTurn === this.player1Id) {
            this.turnNumber++;
        }

        // Start of next player's turn
        const nextPlayer = this.players[this.currentTurn];

        // Calculate max mana
        let maxMana = this.getMaxMana(this.currentTurn);

        // Apply exhausting penalty
        if (nextPlayer.exhaustingPenalty > 0) {
            maxMana = Math.max(0, maxMana - nextPlayer.exhaustingPenalty);
            nextPlayer.exhaustingPenalty = 0;
        }

        // Refill mana
        nextPlayer.currentMana = maxMana;

        // Draw cards up to target hand size
        const cardsNeeded = Math.max(0, this.config.targetHandSize - nextPlayer.hand.length);
        if (cardsNeeded > 0) {
            this.drawCards(this.currentTurn, cardsNeeded);
        }

        // Process start of turn effects
        this.processStartOfTurnEffects(this.currentTurn);

        this.addEvent('turn_end', {
            playerId,
            newTurn: this.currentTurn,
            turnNumber: this.turnNumber,
            cardsDrawn: cardsNeeded
        });

        this.checkGameEnd();
        return { success: true, message: 'Turn ended' };
    }

    shuffleDeck(deck) {
        const shuffled = [...deck];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    processEndOfTurnEffects(playerId) {
        const player = this.players[playerId];
        const unitsToDestroy = [];

        player.field.forEach((unit, index) => {
            // VOLATILE: Dies at the end of your turn
            if (unit.abilities && unit.abilities.includes('volatile')) {
                unitsToDestroy.push(unit.instanceId);
                this.addEvent('volatile_death', { unitName: unit.name });
            }

            // INSPIRE: Adjacent allies gain +1/+1 (blocked by cursed)
            if (unit.abilities && unit.abilities.includes('inspire')) {
                const leftAlly = player.field[index - 1];
                const rightAlly = player.field[index + 1];
                if (leftAlly && !leftAlly.inspireBuffedThisTurn && !(leftAlly.abilities && leftAlly.abilities.includes('cursed'))) {
                    leftAlly.currentAttack += 1;
                    leftAlly.currentHealth += 1;
                    leftAlly.health += 1;
                    leftAlly.inspireBuffedThisTurn = true;
                }
                if (rightAlly && !rightAlly.inspireBuffedThisTurn && !(rightAlly.abilities && rightAlly.abilities.includes('cursed'))) {
                    rightAlly.currentAttack += 1;
                    rightAlly.currentHealth += 1;
                    rightAlly.health += 1;
                    rightAlly.inspireBuffedThisTurn = true;
                }
            }
        });

        // Destroy volatile units
        unitsToDestroy.forEach(id => this.destroyUnit(playerId, id));

        // Reset inspire tracking
        player.field.forEach(unit => {
            unit.inspireBuffedThisTurn = false;
        });
    }

    processStartOfTurnEffects(playerId) {
        const player = this.players[playerId];
        const opponent = this.players[this.getOpponent(playerId)];
        const unitsToDestroy = [];
        const unitsToSwitch = [];

        player.field.forEach(unit => {
            unit.hasAttackedThisTurn = false;
            unit.attacksThisTurn = 0; // Reset attack counter for frenzy
            unit.turnsOnField++;

            // Remove warcry bonus from previous turn
            if (unit.warcryBonus) {
                unit.currentAttack -= unit.warcryBonus;
                delete unit.warcryBonus;
            }

            // SLOW: Cannot attack for 1 turn after playing
            if (unit.slowTurnsRemaining && unit.slowTurnsRemaining > 0) {
                unit.slowTurnsRemaining--;
                unit.canAttack = false;
            } else {
                unit.canAttack = true;
            }

            // REGENERATE: Heals 1 health at the start of your turn (blocked by cursed)
            if (unit.abilities && unit.abilities.includes('regenerate')) {
                if (!(unit.abilities && unit.abilities.includes('cursed'))) {
                    unit.currentHealth = Math.min(unit.health, unit.currentHealth + 1);
                }
            }

            // BRITTLE: Loses 1 attack each turn
            if (unit.abilities && unit.abilities.includes('brittle')) {
                unit.currentAttack = Math.max(0, unit.currentAttack - 1);
                this.addEvent('brittle', { unitName: unit.name });
            }

            // DRAINING: Costs 1 mana each turn to keep alive
            if (unit.abilities && unit.abilities.includes('draining')) {
                if (player.currentMana >= 1) {
                    player.currentMana -= 1;
                    this.addEvent('draining', { unitName: unit.name });
                } else {
                    unitsToDestroy.push(unit.instanceId);
                    this.addEvent('draining_death', { unitName: unit.name });
                }
            }

            // DOOMED: Dies after 3 turns on field
            if (unit.abilities && unit.abilities.includes('doomed')) {
                if (unit.doomedTurns !== undefined) {
                    unit.doomedTurns--;
                    if (unit.doomedTurns <= 0) {
                        unitsToDestroy.push(unit.instanceId);
                        this.addEvent('doomed_death', { unitName: unit.name });
                    }
                }
            }

            // DISLOYAL: Switches sides if opponent has more units
            if (unit.abilities && unit.abilities.includes('disloyal')) {
                if (opponent.field.length > player.field.length) {
                    unitsToSwitch.push(unit.instanceId);
                }
            }
        });

        // Destroy units that died from draining or doomed
        unitsToDestroy.forEach(id => this.destroyUnit(playerId, id));

        // Switch disloyal units to opponent
        unitsToSwitch.forEach(id => {
            const idx = player.field.findIndex(u => u.instanceId === id);
            if (idx !== -1 && opponent.field.length < 6) {
                const unit = player.field.splice(idx, 1)[0];
                unit.canAttack = false; // Can't attack immediately after switching
                opponent.field.push(unit);
                this.addEvent('disloyal_switch', { unitName: unit.name });
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
            this.addEvent('game_end', { result: 'draw' });
        } else if (p1Health <= 0) {
            this.phase = 'ended';
            this.winner = this.player2Id;
            this.addEvent('game_end', { winner: this.player2Name, winnerId: this.player2Id });
        } else if (p2Health <= 0) {
            this.phase = 'ended';
            this.winner = this.player1Id;
            this.addEvent('game_end', { winner: this.player1Name, winnerId: this.player1Id });
        }
    }

    getStateForPlayer(playerId) {
        const opponent = this.getOpponent(playerId);
        const playerState = this.players[playerId];
        const opponentState = this.players[opponent];

        // Get lastEvent for animations (don't clear - both players need to see it)
        const lastEvent = this.lastEvent;

        // Check if this player needs to select cards
        const inCardSelection = this.pendingCardSelection &&
                               this.pendingCardSelection.playerId === playerId;

        return {
            gameId: this.id,
            phase: this.phase,
            winner: this.winner,
            winnerName: this.winner === 'draw' ? 'Draw' :
                        this.winner === this.player1Id ? this.player1Name :
                        this.winner === this.player2Id ? this.player2Name : null,
            isYourTurn: this.currentTurn === playerId,
            inCardSelection, // True if player needs to select cards to shuffle back
            turnNumber: this.turnNumber,
            landCost: this.config.landCost,
            targetHandSize: this.config.targetHandSize,
            lastEvent, // For attack animations
            events: this.events.slice(-10),
            you: {
                id: playerId,
                name: playerState.name,
                health: playerState.health,
                baseMana: this.getBaseMana(),
                maxMana: this.getMaxMana(playerId),
                currentMana: playerState.currentMana,
                hand: playerState.hand,
                field: playerState.field,
                lands: playerState.lands,
                landPool: playerState.landPool, // Available lands to play
                deckCount: playerState.deck.length,
                graveyardCount: playerState.graveyard.length
            },
            opponent: {
                id: opponent,
                name: opponentState.name,
                health: opponentState.health,
                baseMana: this.getBaseMana(),
                maxMana: this.getMaxMana(opponent),
                currentMana: opponentState.currentMana,
                handCount: opponentState.hand.length,
                field: opponentState.field,
                lands: opponentState.lands,
                landPool: opponentState.landPool,
                deckCount: opponentState.deck.length,
                graveyardCount: opponentState.graveyard.length
            }
        };
    }

    handleDisconnect(playerId) {
        this.phase = 'ended';
        this.winner = this.getOpponent(playerId);
        const winnerName = this.winner === this.player1Id ? this.player1Name : this.player2Name;
        this.addEvent('player_disconnected', { playerId, winner: winnerName });
    }
}

module.exports = Game;
