import type { GameState, MobileAccessibilityPreset, MobileSkillPreset } from '../types';
import { MOBILE_INPUT_CONFIG } from './config';

interface AccessibilityModifiers {
  controlsScaleMultiplier: number;
  buttonHitSlopMultiplier: number;
  aimAssistStrengthBonus: number;
  aimAssistConeBonusDeg: number;
  attackBufferBonusFrames: number;
  swapLongPressMultiplier: number;
  jumpSwipeMultiplier: number;
  dropSwipeMultiplier: number;
  doubleTapWindowBonusMs: number;
  doubleTapDistanceMultiplier: number;
}

interface SkillModifiers {
  aimAssistStrengthBonus: number;
  aimAssistConeBonusDeg: number;
  aimAssistCurveExponentDelta: number;
  aimSmoothing: number;
  attackBufferBonusFrames: number;
  doubleTapWindowBonusMs: number;
  doubleTapDistanceMultiplier: number;
  aimVelocityLerp: number;
}

const ACCESSIBILITY_MODIFIERS: Record<MobileAccessibilityPreset, AccessibilityModifiers> = {
  standard: {
    controlsScaleMultiplier: 1,
    buttonHitSlopMultiplier: 1,
    aimAssistStrengthBonus: 0,
    aimAssistConeBonusDeg: 0,
    attackBufferBonusFrames: 0,
    swapLongPressMultiplier: 1,
    jumpSwipeMultiplier: 1,
    dropSwipeMultiplier: 1,
    doubleTapWindowBonusMs: 0,
    doubleTapDistanceMultiplier: 1,
  },
  large_controls: {
    controlsScaleMultiplier: 1.22,
    buttonHitSlopMultiplier: 1.18,
    aimAssistStrengthBonus: 0.04,
    aimAssistConeBonusDeg: 2,
    attackBufferBonusFrames: 4,
    swapLongPressMultiplier: 1.08,
    jumpSwipeMultiplier: 0.9,
    dropSwipeMultiplier: 0.92,
    doubleTapWindowBonusMs: 18,
    doubleTapDistanceMultiplier: 1.06,
  },
  assisted: {
    controlsScaleMultiplier: 1.14,
    buttonHitSlopMultiplier: 1.12,
    aimAssistStrengthBonus: 0.1,
    aimAssistConeBonusDeg: 6,
    attackBufferBonusFrames: 8,
    swapLongPressMultiplier: 1.18,
    jumpSwipeMultiplier: 0.88,
    dropSwipeMultiplier: 0.9,
    doubleTapWindowBonusMs: 36,
    doubleTapDistanceMultiplier: 1.1,
  },
};

const SKILL_MODIFIERS: Record<MobileSkillPreset, SkillModifiers> = {
  casual: {
    aimAssistStrengthBonus: 0.08,
    aimAssistConeBonusDeg: 5,
    aimAssistCurveExponentDelta: -0.3,
    aimSmoothing: 0.48,
    attackBufferBonusFrames: 6,
    doubleTapWindowBonusMs: 22,
    doubleTapDistanceMultiplier: 1.08,
    aimVelocityLerp: 0.2,
  },
  standard: {
    aimAssistStrengthBonus: 0,
    aimAssistConeBonusDeg: 0,
    aimAssistCurveExponentDelta: 0,
    aimSmoothing: MOBILE_INPUT_CONFIG.aimSmoothing,
    attackBufferBonusFrames: 0,
    doubleTapWindowBonusMs: 0,
    doubleTapDistanceMultiplier: 1,
    aimVelocityLerp: 0.3,
  },
  precision: {
    aimAssistStrengthBonus: -0.08,
    aimAssistConeBonusDeg: -4,
    aimAssistCurveExponentDelta: 0.25,
    aimSmoothing: 0.34,
    attackBufferBonusFrames: -2,
    doubleTapWindowBonusMs: -18,
    doubleTapDistanceMultiplier: 0.92,
    aimVelocityLerp: 0.42,
  },
};

function getModifiers(state: GameState): AccessibilityModifiers {
  return ACCESSIBILITY_MODIFIERS[state.mobileAccessibilityPreset];
}

function getSkillModifiers(state: GameState): SkillModifiers {
  return SKILL_MODIFIERS[state.mobileSkillPreset];
}

export function getEffectiveControlsScale(state: GameState): number {
  return (state.controlsScale || 1) * getModifiers(state).controlsScaleMultiplier;
}

export function getEffectiveButtonHitSlop(state: GameState): number {
  return MOBILE_INPUT_CONFIG.buttonHitSlop * getModifiers(state).buttonHitSlopMultiplier;
}

export function getEffectiveJumpSwipeDistance(state: GameState): number {
  return MOBILE_INPUT_CONFIG.jumpSwipeDistance * getModifiers(state).jumpSwipeMultiplier;
}

export function getEffectiveDropSwipeDistance(state: GameState): number {
  return MOBILE_INPUT_CONFIG.dropSwipeDistance * getModifiers(state).dropSwipeMultiplier;
}

export function getEffectiveDoubleTapWindowMs(state: GameState): number {
  return MOBILE_INPUT_CONFIG.doubleTapWindowMs
    + getModifiers(state).doubleTapWindowBonusMs
    + getSkillModifiers(state).doubleTapWindowBonusMs;
}

export function getEffectiveDoubleTapMaxDistance(state: GameState): number {
  return MOBILE_INPUT_CONFIG.doubleTapMaxDistance
    * getModifiers(state).doubleTapDistanceMultiplier
    * getSkillModifiers(state).doubleTapDistanceMultiplier;
}

export function getEffectiveSwapLongPressMs(state: GameState): number {
  return MOBILE_INPUT_CONFIG.swapLongPressMs * getModifiers(state).swapLongPressMultiplier;
}

export function getEffectiveAttackBufferBaseFrames(state: GameState): number {
  return Math.max(
    6,
    MOBILE_INPUT_CONFIG.attackBufferFrames
      + getModifiers(state).attackBufferBonusFrames
      + getSkillModifiers(state).attackBufferBonusFrames,
  );
}

export function getEffectiveAimAssistConeDeg(state: GameState): number {
  return MOBILE_INPUT_CONFIG.aimAssistConeDeg
    + getModifiers(state).aimAssistConeBonusDeg
    + getSkillModifiers(state).aimAssistConeBonusDeg;
}

export function getEffectiveAimAssistInnerConeDeg(state: GameState): number {
  return MOBILE_INPUT_CONFIG.aimAssistInnerConeDeg
    + getModifiers(state).aimAssistConeBonusDeg * 0.4
    + getSkillModifiers(state).aimAssistConeBonusDeg * 0.3;
}

export function getEffectiveAimAssistStrength(state: GameState): number {
  return Math.min(
    0.95,
    MOBILE_INPUT_CONFIG.aimAssistStrength
      + getModifiers(state).aimAssistStrengthBonus
      + getSkillModifiers(state).aimAssistStrengthBonus,
  );
}

export function getEffectiveAimAssistMaxStrength(state: GameState): number {
  return Math.min(
    0.98,
    MOBILE_INPUT_CONFIG.aimAssistMaxStrength
      + getModifiers(state).aimAssistStrengthBonus
      + getSkillModifiers(state).aimAssistStrengthBonus,
  );
}

export function getEffectiveAimAssistCurveExponent(state: GameState): number {
  return Math.max(0.7, MOBILE_INPUT_CONFIG.aimAssistCurveExponent + getSkillModifiers(state).aimAssistCurveExponentDelta);
}

export function getEffectiveAimSmoothing(state: GameState): number {
  return getSkillModifiers(state).aimSmoothing;
}

export function getEffectiveAimVelocityLerp(state: GameState): number {
  return getSkillModifiers(state).aimVelocityLerp;
}
