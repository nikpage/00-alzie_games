# Brain Snack Platform – Master Plan

## Project Overview

Brain Snack is a web-first micro-game platform built around short (60–120 second) sessions designed for repeat daily play.

Primary objective:
- Deliver highly replayable, short-form cognitive games.

Secondary objective:
- Collect structured performance data for long-term Cognitive Change Tracking.

This is not a medical product.
This platform does not diagnose, predict, or treat medical conditions.

---

## Core Product Principles

- Games first, health second.
- Short session loops (≤ 2 minutes).
- Frictionless replay.
- Input-agnostic (touch + keyboard).
- Modular system architecture.
- Analytics isolated from gameplay.
- Cognitive Change Tracking built only after validated engagement.

## Architecture Principles

- Game logic isolated
- Analytics isolated
- Cognitive Change Tracking isolated
- Social layer isolated
- Monetization isolated
- API-based communication between layers
- Event-driven session ingestion
- Web-first, responsive architecture
- Input-agnostic (touch + keyboard)

---

# Platform Strategy

Phase 1–3:
- Responsive web application
- Mobile-first UI
- Desktop keyboard support
- No native apps
- No PWA features initially

PWA packaging considered after retention validation.

---

## Clinical-Grade Data Readiness (Non-Medical Positioning)

The platform is not positioned as a medical device.

However, data architecture will support future clinical interpretability.

### Data Integrity Requirements

- Store full reaction time arrays (not just averages)
- Store error timing and sequence
- Store full session timestamps
- Store device type and input mode
- Version all scoring logic
- Version game rules and difficulty parameters

Required metadata fields:

- game_version
- scoring_version
- difficulty_version
- analytics_version

Historical data must never be silently modified.

---

### Longitudinal Stability Rules

- No baseline resets without explicit version increment
- No retroactive score recalculation
- All scoring changes require version bump
- Derived metrics stored separately from raw data

---

### Export Capability (Future Phase)

Planned:

- CSV export of raw session metrics
- 30/90/180 day trend summaries
- Domain-level performance trends

Exports labeled as:

“Game Performance Trend Report”

Not a diagnostic or medical report.

---

### Terminology Constraints

Avoid medical language.

Use:

- Performance trend
- Stability shift
- Variability change
- Longitudinal pattern

Do not use:

- Diagnosis
- Disease progression
- Alzheimer detection
- Dementia staging

---

# Phase 1 – Vertical Slice (Speed Game + Logging)

Details:
→ See: 02_PHASE_1_VERTICAL_SLICE.md

---

# Phase 2 – Multi-Game Support + Personal History

Details:
→ See: 03_PHASE_2_MULTI_GAME.md

---

# Phase 3 – Async Duels + Basic Leaderboards

Details:
→ See: 04_PHASE_3_SOCIAL_ASYNC.md

---

# Phase 4 – Cognitive Analytics Engine v1

Details:
→ See: 05_PHASE_4_ANALYTICS_V1.md

---

# Phase 5 – Subscription + Monetization Layer

Details:
→ See: 06_PHASE_5_MONETIZATION.md

---

# Phase 6 – Group / Organization Structure

Details:
→ See: 07_PHASE_6_GROUPS.md

---

# Phase 7 – Cognitive Change Tracking Engine

Details:
→ See: 08_PHASE_7_COGNITIVE_CHANGE_TRACKING.md

---

# Phase 8 – Live Multiplayer (Optional)

Details:
→ See: 09_PHASE_8_LIVE_PLAY.md

---

# Phase 9 – B2B / Organization Dashboard

Details:
→ See: 10_PHASE_9_B2B.md
