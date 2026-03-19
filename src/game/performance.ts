/**
 * Performance monitoring utilities for tracking game performance metrics
 */

interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  lastFrameTime: number;
  frameCount: number;
}

let metrics: PerformanceMetrics = {
  fps: 60,
  frameTime: 16,
  lastFrameTime: performance.now(),
  frameCount: 0,
};

let fpsCallbacks: ((fps: number) => void)[] = [];

/**
 * Update performance metrics - should be called once per frame
 */
export function updatePerformanceMetrics(): void {
  const now = performance.now();
  const delta = now - metrics.lastFrameTime;
  
  if (delta > 0) {
    metrics.frameTime = delta;
    metrics.fps = Math.round(1000 / delta);
  }
  
  metrics.lastFrameTime = now;
  metrics.frameCount++;
  
  // Notify FPS subscribers every 30 frames (roughly every 0.5 seconds at 60fps)
  if (metrics.frameCount % 30 === 0) {
    fpsCallbacks.forEach(cb => cb(metrics.fps));
  }
}

/**
 * Get current FPS
 */
export function getCurrentFPS(): number {
  return metrics.fps;
}

/**
 * Get average frame time in milliseconds
 */
export function getFrameTime(): number {
  return metrics.frameTime;
}

/**
 * Register a callback to be called when FPS updates
 */
export function onFPSUpdate(callback: (fps: number) => void): () => void {
  fpsCallbacks.push(callback);
  // Return unsubscribe function
  return () => {
    fpsCallbacks = fpsCallbacks.filter(cb => cb !== callback);
  };
}

/**
 * Measure execution time of a function
 */
export function measureFunctionTime(name: string, fn: () => void): number {
  const start = performance.now();
  fn();
  const duration = performance.now() - start;
  
  if (duration > 16) {
    // Frame drop warning - took longer than one frame at 60fps
    console.warn(`[Performance] ${name} took ${duration.toFixed(2)}ms (exceeds 16ms frame budget)`);
  }
  
  return duration;
}

/**
 * Reset performance metrics
 */
export function resetPerformanceMetrics(): void {
  metrics = {
    fps: 60,
    frameTime: 16,
    lastFrameTime: performance.now(),
    frameCount: 0,
  };
  fpsCallbacks = [];
}

export type { PerformanceMetrics };
