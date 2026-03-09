# Elemental Stickman

Elemental Stickman is a fast-paced, action-platformer built on **React**, **TypeScript**, and the **HTML5 Canvas API**. The game features dynamic combat mechanics where players must adapt and utilize four distinct elements—Fire, Water, Earth, and Wind—to overcome diverse enemies and navigate challenging levels.

This project is built from scratch using a highly optimized custom rendering engine specifically designed to run flawlessly across modern desktop browsers and mobile devices.

---

## 🎮 Game Modes

### 1. Campaign Mode
- **15 Story-Driven Levels**: Gradually introduces new elements, enemies, and obstacles. 
- **Objectives**: Collect hidden gems to open the exit portal while surviving enemy hordes.
- **Boss Fights**: Face off against formidable bosses such as the **Stone Overlord** and **Elemental Wraith**.

### 2. Wave Survival Mode
- **Endless Combat**: Survive against infinite, increasingly difficult enemy waves in a dedicated arena.
- **Global Leaderboard**: Secure your spot among the top players based on survival time and kill count.
- **Dynamic Spawning**: Enemies spawn with escalating health and damage scaling over time.

---

## ✨ Core Mechanics

### 🔮 The Four Elements
Players unlock and switch between elements on the fly, each offering unique tactical advantages:
- 🔥 **Fire**: Casts lingering flame projectiles that burn enemies over time.
- 💧 **Water**: Fires rapid bubbles that bounce off terrain, ideal for confined spaces.
- 🪨 **Earth**: Drops heavy, detailed rotating boulders that deal massive physical damage. Aiming closely to the ground shapes the earth into organic, mossy rock slab platforms to alter the terrain.
- 🌪️ **Wind**: Shoots high-speed gusts that rapidly push enemies back and deal piercing damage.

### 🏃🏾‍♂️ Advanced Movement
- **Double Jump**: Unlockable, allowing for high vertical mobility.
- **Dash**: Quick directional bursts using an stamina/cooldown system. Allows players to evade attacks and reposition.

### 💰 Upgrade Shop System
Players collect gems throughout the campaign/survival modes to permanently upgrade their stats via an in-game store:
- Max Health (+25 per tier)
- Max Mana (+25 per tier)
- Mana Regeneration (+20% per tier)
- Spell Damage (+25% per tier)
- Double Jump (+1 max count)
- Dash Distance (+15% per tier)

---

## 📱 Platform & Accessibility Specifications

### Cross-Platform Controls
- **Desktop**: 
  - Movement: `WASD` or `Arrow Keys`
  - Elements: Number keys `1`, `2`, `3`, `4`
  - Attack: `Mouse Click` (Directional firing towards cursor)
  - Dash: `Shift`
- **Mobile**: 
  - Movement: Virtual floating left D-Pad
  - Element Switch: On-screen tap buttons
  - Attack: Virtual 'CAST' joystick with **360° Drag-to-Aim** and visual projectile path guides.
  - Immersive Mode: Automatic full-screen transitions scaling perfectly for both Landscape and Portrait.

### Internationalization (i18n)
- Full localized text dictionaries for both **English** and **Hindi**.
- Supports dynamic text scaling based on language properties.

### Accessibility & Video Settings
- **Graphics Quality Modes**: Toggles background objects, particles, and star-fields off for low-end hardware.
- **Reduced Motion**: Disables screen-shake, pulse animations, and heavy visually-taxing particle systems to support sensitive players.
- **High Contrast Mode**: Adds dark, solid backdrops behind bright elements to assist vision-impaired players.
- **Audio Mixers**: Independent sliders for Music, SFX, and Master volume.

---

## 🛠️ Technical Specifications

### Tech Stack
- **Frontend**: React 18, Vite
- **Language**: TypeScript (Strict Typing)
- **Styling**: Tailwind CSS (UI overlays) & Canvas Context (Game rendering)
- **Architecture**: A fixed-step game loop (usually 60 UPS/FPS) decoupling state updates from rendering logic to ensure deterministic behavior across varied refresh-rate monitors.

### Custom Rendering Engine (renderer.ts)
- Custom lighting composite operations (`globalCompositeOperation = 'lighter'`) for emissive magic effects.
- Parallax scrolling background layers (stars / nebulae).
- Procedural level generation/rendering logic (Mossy Earth platforms).

### Persistence & Data
- Progress is locally serialized to `localStorage` safely mapping `GameState` variables.
- Supports external database syncing via a background task queue to save player upgrades remotely without blocking the main game thread.

---

## 🚀 Running Locally

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Development Server**:
   ```bash
   npm run dev
   ```

3. **Build for Production**:
   ```bash
   npm run build
   ```
   (Outputs static bundle to the `/dist` directory).
