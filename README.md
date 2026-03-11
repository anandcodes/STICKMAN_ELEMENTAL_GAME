# Stickman Elemental – Development Roadmap

## Project Overview

**Stickman Elemental** is an elemental action-platformer featuring dynamic combat, puzzle-based environments, and progression systems.
Players control a stickman warrior capable of wielding four elemental powers—Fire, Water, Earth, and Wind—to overcome enemies, solve environmental puzzles, and traverse challenging platforming levels.

The goal of this roadmap is to guide development toward a **stable and polished Version 1 release for Play Store and App Store**, followed by feature expansions and content updates.

---

# Development Phases

## Phase 1 – Player Onboarding (Tutorial System)

**Goal:** Ensure new players learn controls and mechanics within the first few minutes of gameplay.

### Tutorial Structure

The tutorial will consist of four guided levels.

### Level 1 – Movement Basics

Teach core movement mechanics.

Features:

* Walking
* Jumping
* Platform traversal
* Checkpoints

Player prompts:

* "Use LEFT/RIGHT to move"
* "Press SPACE to jump"

Mobile instructions:

* Use joystick to move
* Tap jump button

---

### Level 2 – Element Introduction

Introduce **Fire Element**.

Player learns:

* Element switching
* Casting elemental projectiles
* Burning wooden crates
* Lighting fire pits

Prompt example:

* "Press 1 to switch to Fire"
* "Click to cast Fireball"

---

### Level 3 – Dash Ability

Introduce dash mechanic.

Player learns:

* Directional dash
* Dash invincibility frames
* Dodging obstacles

Prompt example:

* "Press SHIFT to dash"
* "Dash grants brief invincibility"

---

### Level 4 – Elemental Interaction

Introduce environmental element puzzles.

Example puzzles:

* Fire ignites torches
* Water grows plants
* Earth creates platforms
* Wind activates turbines

Deliverables:

* Tutorial levels
* Contextual hints
* Mobile/desktop control instructions

---

# Phase 2 – Combat Feedback & Game Feel

**Goal:** Improve responsiveness and player satisfaction.

### Enemy Hit Feedback

When an enemy is hit:

* Small screen shake
* Particle burst
* Enemy flash effect

---

### Player Damage Feedback

When the player takes damage:

* Red screen flash
* Knockback
* Mobile vibration feedback

---

### Element Casting Effects

Each element should have unique audiovisual feedback.

Fire

* Flame particles
* Burning sound

Water

* Splash particles
* Liquid effects

Earth

* Rock fragments
* Heavy impact sound

Wind

* Swirling particles
* Wind audio

---

### Dash Feedback

Enhancements:

* Dash trail
* Motion blur
* Dash sound effect
* Camera shake

---

# Phase 3 – Difficulty Balancing

**Goal:** Provide a smooth difficulty curve.

### Level Progression

| Level | Focus              | Difficulty |
| ----- | ------------------ | ---------- |
| 1     | Movement           | Very Easy  |
| 2     | Jump timing        | Easy       |
| 3     | Fire element       | Easy       |
| 4     | Dash ability       | Medium     |
| 5     | Enemy introduction | Medium     |
| 6–10  | Element puzzles    | Medium     |
| 11–15 | Combat mastery     | Hard       |

---

### Balancing Parameters

Expose balancing parameters for quick tuning:

* Enemy health multiplier
* Enemy spawn rate
* Player damage
* Elemental damage
* Mana cost

---

# Phase 4 – Campaign Expansion

**Goal:** Increase content and exploration.

Current campaign length: **15 levels**
Target campaign length: **25–30 levels**

---

### Biome 1 – Forest Ruins

Environment:

* Vines
* Spikes
* Moving platforms

Enemies:

* Slimes
* Bats

Boss:
Ancient Tree Guardian

---

### Biome 2 – Frozen Caverns

Environment:

* Ice floors
* Falling icicles

Enemies:

* Ice Spirits

Boss:
Ice Titan

---

### Biome 3 – Volcanic Depths

Environment:

* Lava pools
* Fire traps

Enemies:

* Fire Golems

Boss:
Lava Colossus

---

# Phase 5 – Replayability Systems

## Procedural Dungeon Mode

New game mode: **Elemental Trials**

Features:

* Procedurally generated rooms
* Random enemy spawns
* Environmental hazards
* Reward chests

Example modifiers:

* Low gravity
* Double enemy speed
* Mana regeneration disabled
* Exploding enemies

Rewards:

* Rare gems
* Relics
* Cosmetics

---

## Relic System

Relics provide temporary run-based power modifiers.

Example relics:

Burning Soul
Fire spells cost no mana but slowly drain health.

Storm Crown
Wind spells chain lightning to nearby enemies.

Titan Core
Earth projectiles increase in size and damage.

Frozen Blood
Taking damage freezes nearby enemies.

Players can equip **up to 3 relics per run**.

---

# Phase 6 – Player Progression

Introduce a **Skill Tree system**.

Players spend gems to unlock elemental upgrades.

Example structure:

Fire Tree

* Ember Shot
* Fire Burst
* Phoenix Dash

Water Tree

* Ice Lance
* Healing Mist
* Tsunami Wave

Earth Tree

* Stone Shield
* Crystal Armor
* Quake Slam

Wind Tree

* Tornado Pull
* Air Dash
* Lightning Surge

---

# Phase 7 – Retention Systems

Mobile games benefit from systems that encourage players to return regularly.

## Daily Challenge Mode

Every day:

* New dungeon seed
* Random modifiers
* Global leaderboard

---

## Daily Rewards

Example reward schedule:

| Day | Reward        |
| --- | ------------- |
| 1   | 50 Gems       |
| 2   | Health Potion |
| 3   | Mana Crystal  |
| 5   | Relic Chest   |
| 7   | Rare Skin     |

---

# Phase 8 – UI / UX Improvements

Essential menus:

* Main Menu
* Settings
* Pause Menu
* Level Select
* Shop
* Achievements

---

## Settings Menu Options

Graphics Quality

* Low
* Medium
* High

Audio

* Music volume
* Sound volume

Gameplay

* Vibration toggle
* Language selection
* Control layout

---

# Phase 9 – Performance Optimization

Target performance:

| Device          | Target FPS |
| --------------- | ---------- |
| Low-end Android | 30 FPS     |
| Mid-range       | 60 FPS     |
| High-end        | 60+ FPS    |

Optimization techniques:

* Object pooling for projectiles
* Particle count reduction
* Dynamic lighting optimization
* AI update throttling

---

# Phase 10 – Store Preparation

## Play Store Requirements

Prepare the following assets:

* App icon (512x512)
* Feature graphic (1024x500)
* 5 gameplay screenshots
* Gameplay trailer
* Privacy policy

---

## App Store Requirements

Prepare:

* iPhone screenshots
* Launch screen
* Privacy details

---

# Final Launch Checklist

Before publishing:

* No crash bugs
* Stable save system
* Tutorial completed
* All levels completable
* Performance stable
* UI readable on mobile
* Sound and music functioning

---

# Estimated Development Timeline

| Phase                  | Duration  |
| ---------------------- | --------- |
| Tutorial System        | 1 week    |
| Game Feel Improvements | 1 week    |
| Difficulty Balancing   | 1 week    |
| Campaign Expansion     | 2–3 weeks |
| Replayability Systems  | 2 weeks   |
| Skill Tree             | 1 week    |
| Retention Systems      | 1 week    |
| UI / UX Polish         | 1 week    |
| Optimization           | 1 week    |

**Total estimated development time:**
Approximately **10–12 weeks to launch-ready build**

---

# Future Updates (Post Launch)

After Version 1 release:

* New elements
* Additional biomes
* Multiplayer mode
* Cosmetic marketplace
* Seasonal events
* New bosses and dungeons

---

# Project Goal

Deliver a polished **elemental action-platformer** with:

* engaging combat
* satisfying movement
* strong replayability
* smooth mobile experience

The initial release will focus on **stability, accessibility, and strong core gameplay**, followed by feature expansions based on player feedback.
