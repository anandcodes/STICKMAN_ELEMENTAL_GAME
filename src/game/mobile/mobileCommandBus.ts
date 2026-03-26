export type MobileControlButton = 'jump' | 'attack' | 'swap' | 'pause';

export type MobileControlCommand =
  | { type: 'pause_toggle' }
  | { type: 'button_press'; button: MobileControlButton; touchId: number }
  | { type: 'button_release'; button: MobileControlButton; touchId: number }
  | { type: 'movement_start'; touchId: number; x: number; y: number }
  | { type: 'movement_move'; touchId: number; x: number; y: number }
  | { type: 'movement_end'; touchId: number }
  | { type: 'aim_start'; touchId: number; x: number; y: number }
  | { type: 'aim_move'; touchId: number; x: number; y: number }
  | { type: 'aim_end'; touchId: number; fire: boolean; x: number; y: number }
  | { type: 'jump_trigger'; source: 'button' | 'swipe' }
  | { type: 'attack_trigger'; source: 'button' | 'aim_release' }
  | { type: 'dash_trigger' }
  | { type: 'drop_trigger' }
  | { type: 'swap_tap' }
  | { type: 'swap_hold_begin'; touchId: number }
  | { type: 'swap_hold_end'; touchId: number };

export interface MobileCommandBusState {
  queue: MobileControlCommand[];
}

export function createMobileCommandBusState(): MobileCommandBusState {
  return { queue: [] };
}

export function enqueueMobileCommands(
  bus: MobileCommandBusState,
  commands: readonly MobileControlCommand[],
): void {
  if (commands.length === 0) return;
  for (const command of commands) {
    bus.queue.push(command);
  }
}

export function drainMobileCommands(bus: MobileCommandBusState): MobileControlCommand[] {
  if (bus.queue.length === 0) return [];
  const next = bus.queue.slice();
  bus.queue.length = 0;
  return next;
}
