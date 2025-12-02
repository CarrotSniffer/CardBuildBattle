# Card Game - Account & Card Builder System Plan

## Overview
Add user authentication, persistent storage, and a point-buy card creation system where players design custom cards within balanced constraints.

---

## 1. User Authentication System

### Features
- Username/password registration and login
- Passwords hashed with bcrypt
- Session tokens (JWT) for staying logged in
- All data tied to user accounts

### New Files
- `src/server/auth.js` - Registration, login, token verification
- `src/server/database.js` - SQLite database wrapper
- `src/client/js/auth.js` - Login/register UI logic
- `src/client/login.html` - Login/register page

### Database Tables
```sql
users (
  id visibleUUID PRIMARY KEY,
  username TEXT UNIQUE,
  password_hash TEXT,
  created_at TIMESTAMP
)
```

---

## 2. Database Storage (SQLite)

Simple file-based database, no external setup required.

### Tables
```sql
cards (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  name TEXT,
  card_data JSON,  -- stats, abilities, etc.
  point_cost INTEGER,  -- for validation
  created_at TIMESTAMP
)

decks (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  name TEXT,
  card_ids JSON,  -- array of card IDs with counts
  created_at TIMESTAMP
)
```

### New Dependencies
- `better-sqlite3` - Fast SQLite for Node.js
- `bcrypt` - Password hashing
- `jsonwebtoken` - Session tokens

---

## 3. Point-Buy Card Creator

### Point Budget
- Each card gets **10 points** to spend
- Positive traits cost points
- Negative traits give points back
- Card must end at exactly 0 points (fully spent)

### Base Stats (Cost per point)
| Stat | Cost |
|------|------|
| +1 Attack | 2 points |
| +1 Health | 1 point |
| +1 Mana Cost Reduction | 3 points |

### Positive Traits (Cost points)
| Trait | Cost | Effect |
|-------|------|--------|
| Swift | 3 | Can attack immediately |
| Taunt | 3 | Must be attacked first |
| Ranged | 3 | No counter-attack damage |
| Armor | 2 | Takes 1 less damage |
| Charge | 4 | Double damage on attack |
| Lifesteal | 4 | Heal hero on damage dealt |
| Divine Shield | 3 | Blocks first damage |
| Inspire | 3 | Adjacent allies +1/+1 |

### Negative Traits (Give points back)
| Trait | Refund | Effect |
|-------|--------|--------|
| Frail | +2 | Dies to any damage |
| Slow | +2 | Can't attack for 1 turn after playing |
| Fragile | +1 | Takes double damage |
| Costly | +2 | Costs +2 mana |
| Exhausting | +2 | Lose 2 mana next turn |
| Soulbound | +3 | When this dies, lose 3 health |

### Card Creation Rules
- Base card starts with: 1 Attack, 1 Health, 2 Mana Cost
- Must spend exactly all points (can't go negative or have leftover)
- Name: 1-20 characters
- Card auto-calculates final mana cost based on total point value

### UI Components
- Drag-and-drop trait selection
- Point counter showing remaining budget
- Live card preview
- Stat sliders for Attack/Health
- Save/Edit/Delete card buttons

---

## 4. Deck Builder

### Rules
- Exactly 25 cards per deck
- Maximum 3 copies of any single card
- Must have at least 5 unique cards

### UI Components
- Card collection browser (shows all player's cards)
- Current deck list with counts
- Drag cards to add/remove
- Deck validation indicator
- Save/Load/Delete deck buttons
- Deck selector for matchmaking

---

## 5. New File Structure

```
src/
├── server/
│   ├── index.js (update - add auth routes)
│   ├── auth.js (NEW)
│   ├── database.js (NEW)
│   ├── cardValidator.js (NEW - validates point costs)
│   ├── GameManager.js (update - use player decks)
│   └── data/
│       └── game.db (SQLite database file)
├── shared/
│   ├── Game.js (update - use custom cards)
│   ├── cards.js (update - trait definitions)
│   └── pointSystem.js (NEW - point costs/validation)
└── client/
    ├── index.html (update - add navigation)
    ├── login.html (NEW)
    ├── card-builder.html (NEW)
    ├── deck-builder.html (NEW)
    ├── css/
    │   ├── style.css (update)
    │   ├── auth.css (NEW)
    │   └── builder.css (NEW)
    └── js/
        ├── client.js (update)
        ├── auth.js (NEW)
        ├── cardBuilder.js (NEW)
        └── deckBuilder.js (NEW)
```

---

## 6. Implementation Order

### Phase 1: Database & Auth
1. Add SQLite database setup
2. Create user registration/login
3. Add auth middleware to protect routes
4. Create login/register UI

### Phase 2: Card Builder
5. Define point system in shared code
6. Create card validation logic
7. Build card creator UI with drag-drop
8. API endpoints: create/edit/delete/list cards

### Phase 3: Deck Builder
9. Create deck builder UI
10. API endpoints: create/edit/delete/list decks
11. Deck validation (25 cards, max 3 copies)
12. Deck selector in matchmaking

### Phase 4: Integration
13. Update game to use player's custom decks
14. Update matchmaking to require deck selection
15. Test full flow: register → create cards → build deck → play

---

## 7. API Endpoints

### Auth
- `POST /api/register` - Create account
- `POST /api/login` - Get session token
- `GET /api/me` - Get current user info

### Cards
- `GET /api/cards` - List user's cards
- `POST /api/cards` - Create card
- `PUT /api/cards/:id` - Update card
- `DELETE /api/cards/:id` - Delete card

### Decks
- `GET /api/decks` - List user's decks
- `POST /api/decks` - Create deck
- `PUT /api/decks/:id` - Update deck
- `DELETE /api/decks/:id` - Delete deck

---

## Approval Needed

Ready to implement? This will:
- Add ~15 new files
- Modify 5 existing files
- Add 3 new npm dependencies
