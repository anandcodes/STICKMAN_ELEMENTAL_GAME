#!/usr/bin/env node

const checks = [
  { name: 'settings text', fg: '#e9f3ff', bg: '#071120', min: 4.5 },
  { name: 'settings secondary text', fg: '#9ab7d8', bg: '#071120', min: 4.5 },
  { name: 'menu body text', fg: '#aaaaaa', bg: '#0a0a2e', min: 4.5 },
  { name: 'menu accent text', fg: '#88bbff', bg: '#1a1a3a', min: 4.5 },
  { name: 'hud bright text', fg: '#ffffff', bg: '#08121e', min: 4.5 },
  { name: 'hud warning text', fg: '#ffcc00', bg: '#08121e', min: 4.5 },
  { name: 'hud success text', fg: '#44ff88', bg: '#08121e', min: 3.0 },
  { name: 'high contrast body', fg: '#ffffff', bg: '#000000', min: 7.0 },
];

function hexToRgb(hex) {
  const clean = hex.replace('#', '').trim();
  if (clean.length !== 6) throw new Error(`Unsupported color: ${hex}`);
  return {
    r: Number.parseInt(clean.slice(0, 2), 16),
    g: Number.parseInt(clean.slice(2, 4), 16),
    b: Number.parseInt(clean.slice(4, 6), 16),
  };
}

function srgbToLinear(channel) {
  const value = channel / 255;
  if (value <= 0.03928) return value / 12.92;
  return ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  return (
    0.2126 * srgbToLinear(r) +
    0.7152 * srgbToLinear(g) +
    0.0722 * srgbToLinear(b)
  );
}

function contrastRatio(foreground, background) {
  const l1 = luminance(foreground);
  const l2 = luminance(background);
  const light = Math.max(l1, l2);
  const dark = Math.min(l1, l2);
  return (light + 0.05) / (dark + 0.05);
}

let hasFailure = false;
for (const check of checks) {
  const ratio = contrastRatio(check.fg, check.bg);
  const ok = ratio >= check.min;
  const status = ok ? 'PASS' : 'FAIL';
  console.log(`${status} ${check.name}: ratio=${ratio.toFixed(2)} min=${check.min}`);
  if (!ok) hasFailure = true;
}

if (hasFailure) {
  console.error('Contrast check failed. Please update UI colors to meet accessibility thresholds.');
  process.exit(1);
}

console.log('Contrast check passed.');
