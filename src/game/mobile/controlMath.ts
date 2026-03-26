export type DeadZoneShape = 'radial' | 'square';

export function measureInputDistance(x: number, y: number, shape: DeadZoneShape): number {
  if (shape === 'square') {
    return Math.max(Math.abs(x), Math.abs(y));
  }
  return Math.sqrt(x * x + y * y);
}

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
