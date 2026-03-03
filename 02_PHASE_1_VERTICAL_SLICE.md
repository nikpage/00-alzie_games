# Phase 1 – Vertical Slice

## Goal

Deliver one complete playable game with:
- Account system
- Session storage
- Personal score history
- Responsive layout
- Keyboard support

No analytics engine.
No social features.
No monetization.
No Cognitive Change Tracking.
No PWA features.

---

# Scope

## Platform

- Responsive web app
- Mobile-first design
- Desktop keyboard input supported
- Portrait primary layout
- Works in modern browsers only

---

## Game: Speed Tiles

### Game Rules

- 3x3 grid (Phase 1)
- Target symbol displayed at top
- User taps matching tile
- Keyboard keys optionally mapped to tiles
- Wrong tap = penalty
- Target changes after N correct hits
- Session duration: 90 seconds

### Input

- Touch (mobile)
- Mouse click (desktop)
- Keyboard mapping (QWE/ASD/ZXC or numeric mapping)

### Scoring

- Base points per correct tap
- Combo multiplier
- Time-based bonus
- Accuracy modifier

---

# Data Logging

Store per session:

- user_id
- game_id
- session_id
- timestamp
- duration
- total_score
- accuracy
- reaction_times[]
- error_count
- input_mode (touch/mouse/keyboard)

Raw event storage optional.

---

# Backend

Endpoints:

POST /session
GET /sessions?user_id=
GET /best_score?user_id=

Simple REST.
Stateless.

---

# Frontend Screens

1. Login
2. Play
3. Results
4. History (last 10 sessions + best score)

---

# Completion Criteria

- Game runs smoothly on mobile
- Game works on desktop with keyboard
- Session data stored correctly
- History renders correctly
- No crashes
- Restart requires ≤ 2 interactions

# Phase 1 – Vertical Slice

## Goal

Deliver one complete playable game with:
- Account system
- Session storage
- Personal score history
- Responsive layout
- Keyboard support

No analytics engine.
No social features.
No monetization.
No Cognitive Change Tracking.
No PWA features.

---

# Scope

## Platform

- Responsive web app
- Mobile-first design
- Desktop keyboard input supported
- Portrait primary layout
- Works in modern browsers only

---

## Game: Speed Tiles

### Game Rules

- 3x3 grid (Phase 1)
- Target symbol displayed at top
- User taps matching tile
- Keyboard keys optionally mapped to tiles
- Wrong tap = penalty
- Target changes after N correct hits
- Session duration: 90 seconds

### Input

- Touch (mobile)
- Mouse click (desktop)
- Keyboard mapping (QWE/ASD/ZXC or numeric mapping)

### Scoring

- Base points per correct tap
- Combo multiplier
- Time-based bonus
- Accuracy modifier

---

# Data Logging

Store per session:

- user_id
- game_id
- session_id
- timestamp
- duration
- total_score
- accuracy
- reaction_times[]
- error_count
- input_mode (touch/mouse/keyboard)

Raw event storage optional.

---

# Backend

Endpoints:

POST /session
GET /sessions?user_id=
GET /best_score?user_id=

Simple REST.
Stateless.

---

# Frontend Screens

1. Login
2. Play
3. Results
4. History (last 10 sessions + best score)

---

# Completion Criteria

- Game runs smoothly on mobile
- Game works on desktop with keyboard
- Session data stored correctly
- History renders correctly
- No crashes
- Restart requires ≤ 2 interactions
