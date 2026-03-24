/**
 * Procedural Audio System for Elemental Stickman
 * Uses Web Audio API — no external sound files needed.
 * All sounds are generated mathematically for instant loading.
 */

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let musicGain: GainNode | null = null;
let sfxGain: GainNode | null = null;
let musicPlaying = false;
let musicOscillators: OscillatorNode[] = [];
let _musicInterval: ReturnType<typeof setInterval> | null = null;

// Volume settings (0-1)
let masterVolume = 0.5;
let sfxVolume = 0.7;
let musicVolume = 0.25;

function ensureContext(): AudioContext {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        masterGain = audioCtx.createGain();
        masterGain.gain.value = masterVolume;
        masterGain.connect(audioCtx.destination);

        sfxGain = audioCtx.createGain();
        sfxGain.gain.value = sfxVolume;
        sfxGain.connect(masterGain);

        musicGain = audioCtx.createGain();
        musicGain.gain.value = musicVolume;
        musicGain.connect(masterGain);
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

// ===== HELPER: Play a tone =====
function playTone(
    freq: number, duration: number, type: OscillatorType = 'sine',
    volume = 0.3, detune = 0, delay = 0,
    targetGain?: GainNode,
) {
    const ctx = ensureContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;

    const startTime = ctx.currentTime + delay;
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(targetGain || sfxGain || ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
}

// ===== HELPER: Noise burst =====
function playNoise(duration: number, volume = 0.1, highpass = 1000): void {
    const ctx = ensureContext();
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1);
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = highpass;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(sfxGain || ctx.destination);

    source.start();
    source.stop(ctx.currentTime + duration + 0.05);
}

// ===== SFX FUNCTIONS =====

export function playJump(): void {
    // Classic cartoon boing! Quick upward pitch slide
    const ctx = ensureContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t = ctx.currentTime;
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(700, t + 0.15);
    
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
    
    osc.connect(gain);
    gain.connect(sfxGain || ctx.destination);
    osc.start(t);
    osc.stop(t + 0.15);
}

export function playLand(): void {
    playTone(150, 0.08, 'triangle', 0.15);
    playTone(100, 0.08, 'sine', 0.1, 0, 0.02);
}

export function playCastFire(): void {
    // Cute fire 'pew'
    playTone(700, 0.15, 'triangle', 0.15);
    playTone(300, 0.1, 'sine', 0.1, 0, 0.05);
}

export function playCastWater(): void {
    // Bubbly splash
    playTone(500, 0.1, 'sine', 0.15);
    playTone(700, 0.15, 'sine', 0.15, 0, 0.05);
    playTone(900, 0.1, 'sine', 0.1, 0, 0.1);
}

export function playCastEarth(): void {
    // Chunky blunt sound
    playTone(150, 0.15, 'square', 0.1);
    playTone(100, 0.15, 'triangle', 0.12, 0, 0.05);
}

export function playCastWind(): void {
    // Whimsical swoosh
    const ctx = ensureContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t = ctx.currentTime;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(1200, t + 0.2);
    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.15, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
    osc.connect(gain);
    gain.connect(sfxGain || ctx.destination);
    osc.start(t);
    osc.stop(t + 0.2);
}

export function playHit(): void {
    // Cartoon player hit (ouch!)
    playTone(300, 0.15, 'sawtooth', 0.2);
    playTone(150, 0.15, 'triangle', 0.15, 0, 0.05);
}

export function playEnemyHit(): void {
    // Satisfying cartoon 'pop'
    const ctx = ensureContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t = ctx.currentTime;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.1);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
    osc.connect(gain);
    gain.connect(sfxGain || ctx.destination);
    osc.start(t);
    osc.stop(t + 0.1);
}

export function playEnemyDeath(): void {
    // Dropping whistle (descending pitch)
    const ctx = ensureContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t = ctx.currentTime;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.3);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
    osc.connect(gain);
    gain.connect(sfxGain || ctx.destination);
    osc.start(t);
    osc.stop(t + 0.3);
}

export function playSuperEffective(): void {
    playTone(523, 0.1, 'sine', 0.2);
    playTone(659, 0.1, 'sine', 0.2, 0, 0.1);
    playTone(784, 0.15, 'sine', 0.25, 0, 0.2);
}

export function playGemCollect(): void {
    playTone(880, 0.08, 'sine', 0.2);
    playTone(1100, 0.08, 'sine', 0.18, 0, 0.06);
    playTone(1320, 0.12, 'sine', 0.15, 0, 0.12);
}

export function playPotionCollect(): void {
    playTone(440, 0.1, 'sine', 0.15);
    playTone(660, 0.12, 'sine', 0.12, 0, 0.08);
    playTone(880, 0.15, 'sine', 0.1, 0, 0.15);
}

export function playPortalOpen(): void {
    for (let i = 0; i < 5; i++) {
        playTone(300 + i * 100, 0.2, 'sine', 0.12, i * 10, i * 0.08);
    }
    playTone(800, 0.5, 'sine', 0.15, 0, 0.4);
}

export function playPortalEnter(): void {
    for (let i = 0; i < 8; i++) {
        playTone(400 + i * 80, 0.15, 'sine', 0.1, 0, i * 0.05);
    }
}

export function playDamage(): void {
    playTone(150, 0.15, 'sawtooth', 0.2);
    playTone(100, 0.2, 'sawtooth', 0.15, 0, 0.05);
    playNoise(0.1, 0.12, 800);
}

export function playDeath(): void {
    playTone(400, 0.15, 'sawtooth', 0.2);
    playTone(300, 0.2, 'sawtooth', 0.18, 0, 0.1);
    playTone(200, 0.25, 'sawtooth', 0.15, 0, 0.2);
    playTone(100, 0.4, 'sawtooth', 0.12, 0, 0.35);
    playTone(50, 0.5, 'sawtooth', 0.1, 0, 0.5);
}

export function playMenuSelect(): void {
    // Cheerful UI blip
    const ctx = ensureContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t = ctx.currentTime;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
    osc.connect(gain);
    gain.connect(sfxGain || ctx.destination);
    osc.start(t);
    osc.stop(t + 0.05);
}

export function playDash(): void {
    // Quick zip!
    playTone(600, 0.1, 'sine', 0.1);
    playTone(1000, 0.15, 'sine', 0.1, 0, 0.05);
}

export function playCrateBreak(): void {
    playNoise(0.2, 0.15, 400);
    playTone(100, 0.2, 'square', 0.1);
}

export function playLevelComplete(): void {
    const notes = [523, 587, 659, 784, 880, 1047];
    notes.forEach((n, i) => {
        playTone(n, 0.2, 'sine', 0.15, 0, i * 0.1);
        playTone(n * 0.5, 0.25, 'triangle', 0.08, 0, i * 0.1);
    });
}

export function playGameOver(): void {
    const notes = [400, 350, 300, 250, 200];
    notes.forEach((n, i) => {
        playTone(n, 0.3, 'sine', 0.12, 0, i * 0.15);
        playTone(n * 0.75, 0.35, 'triangle', 0.06, 0, i * 0.15);
    });
}

export function playVictory(): void {
    const melody = [523, 659, 784, 1047, 784, 1047, 1318];
    melody.forEach((n, i) => {
        playTone(n, 0.2, 'sine', 0.18, 0, i * 0.12);
        playTone(n * 0.5, 0.25, 'triangle', 0.1, 0, i * 0.12);
    });
}

export function playUltimateReady(): void {
    playTone(880, 0.12, 'sine', 0.2);
    playTone(1320, 0.15, 'triangle', 0.15, 0, 0.05);
    playTone(1760, 0.18, 'sine', 0.12, 0, 0.08);
}

export function playPause(): void {
    playTone(330, 0.1, 'sine', 0.1);
    playTone(220, 0.15, 'sine', 0.08, 0, 0.05);
}

export function playUnpause(): void {
    playTone(220, 0.1, 'sine', 0.1);
    playTone(330, 0.15, 'sine', 0.08, 0, 0.05);
}

export function duckMusicForUltimate(): void {
    ensureContext();
    if (musicGain) {
        const now = audioCtx!.currentTime;
        musicGain.gain.cancelScheduledValues(now);
        musicGain.gain.setTargetAtTime(musicVolume * 0.7, now, 0.05);
        musicGain.gain.setTargetAtTime(musicVolume, now + 1.5, 0.4);
    }
}

export function fadeMusicTo(multiplier: number, duration = 0.4): void {
    ensureContext();
    if (!musicGain) return;
    const now = audioCtx!.currentTime;
    const target = Math.max(0, Math.min(1, multiplier)) * musicVolume;
    musicGain.gain.cancelScheduledValues(now);
    musicGain.gain.setTargetAtTime(target, now, Math.max(0.01, duration / 3));
}

export function playSpikeHit(): void {
    playTone(180, 0.12, 'sawtooth', 0.18);
    playNoise(0.08, 0.1, 1200);
}

export function playElementSwitch(): void {
    playTone(600, 0.05, 'sine', 0.1);
    playTone(800, 0.06, 'sine', 0.08, 0, 0.03);
}

export function playStoneOpen(): void {
    playNoise(0.15, 0.25, 400);
    playTone(140, 0.08, 'sawtooth', 0.12);
    playTone(80, 0.12, 'square', 0.08, 0, 0.05);
}

export function playMetalClick(): void {
    playTone(520, 0.05, 'square', 0.16);
    playTone(840, 0.04, 'sine', 0.12, 0, 0.02);
    playNoise(0.03, 0.04, 3800);
}

// ===== BACKGROUND MUSIC =====
// Simple procedural ambient music using pentatonic scale

const PENTATONIC = [261, 294, 329, 392, 440, 523, 587, 659];

export function startMusic(level = 0): void {
    if (musicPlaying) stopMusic();
    ensureContext();
    musicPlaying = true;

    const baseNote = level * 2; // shift scale for different levels
    let noteIndex = 0;
    let beat = 0;

    _musicInterval = setInterval(() => {
        if (!audioCtx || !musicGain || !musicPlaying) return;

        const scale = PENTATONIC.map(n => n * (1 + level * 0.05));
        const idx = (noteIndex + baseNote) % scale.length;
        const freq = scale[idx];

        // Melody note
        if (beat % 2 === 0) {
            playTone(freq, 0.4, 'sine', 0.08, 0, 0, musicGain);
        }

        // Bass drone every 4 beats
        if (beat % 4 === 0) {
            playTone(freq * 0.25, 0.8, 'triangle', 0.06, 0, 0, musicGain);
        }

        // Soft pad every 8 beats
        if (beat % 8 === 0) {
            playTone(freq * 0.5, 1.5, 'sine', 0.04, 5, 0, musicGain);
            playTone(freq * 0.75, 1.5, 'sine', 0.03, -5, 0, musicGain);
        }

        noteIndex = (noteIndex + 1) % scale.length;
        beat++;
    }, 350); // ~170 BPM
}

export function stopMusic(): void {
    musicPlaying = false;
    if (_musicInterval) {
        clearInterval(_musicInterval);
        _musicInterval = null;
    }
    musicOscillators.forEach(o => { try { o.stop(); } catch { /* already stopped */ } });
    musicOscillators = [];
}

// ===== VOLUME CONTROLS =====

export function setMasterVolume(v: number): void {
    masterVolume = Math.max(0, Math.min(1, v));
    if (masterGain) masterGain.gain.value = masterVolume;
}

export function setSfxVolume(v: number): void {
    sfxVolume = Math.max(0, Math.min(1, v));
    if (sfxGain) sfxGain.gain.value = sfxVolume;
}

export function setMusicVolume(v: number): void {
    musicVolume = Math.max(0, Math.min(1, v));
    if (musicGain) musicGain.gain.value = musicVolume;
}

export function getMasterVolume(): number { return masterVolume; }
export function getSfxVolume(): number { return sfxVolume; }
export function getMusicVolume(): number { return musicVolume; }

export function isMusicPlaying(): boolean { return musicPlaying; }

// Initialize audio on first user interaction
export function initAudio(): void {
    ensureContext();
}
