export const MOBILE_INPUT_CONFIG = {
  movementSideRatio: 0.48,
  joystickDeadZone: 0.14,
  joystickReleaseLerp: 0.18,
  joystickFollowLerp: 0.34,
  joystickMaxTravelFactor: 0.12,
  joystickBaseRadiusFactor: 0.105,
  aimSensitivity: 1,
  aimRadiusFactor: 0.16,
  aimAssistConeDeg: 18,
  aimAssistRange: 320,
  aimAssistStrength: 0.28,
  aimIndicatorRange: 340,
  shootHoldThresholdFrames: 10,
  buttonHitSlop: 1.85,
  rightClusterRadiusFactor: 0.082,
  safeMarginFactor: 0.032,
} as const;

export const MOBILE_CONTROL_ASSET_PATHS = {
  joystickBase: '/assets/mobile-controls/joystick-base.svg',
  joystickKnob: '/assets/mobile-controls/joystick-knob.svg',
  shoot: '/assets/mobile-controls/shoot.svg',
  dash: '/assets/mobile-controls/dash.svg',
  jump: '/assets/mobile-controls/jump.svg',
  pause: '/assets/mobile-controls/pause.svg',
  cycle: '/assets/mobile-controls/cycle.svg',
  crosshair: '/assets/mobile-controls/crosshair.svg',
  abilitySlot: '/assets/mobile-controls/ability-slot.svg',
} as const;

export type MobileControlAssetKey = keyof typeof MOBILE_CONTROL_ASSET_PATHS;
