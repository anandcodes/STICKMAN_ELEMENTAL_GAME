export type BrowserPreludeStep =
  | { type: 'clickSelector'; selector: string; waitMs?: number }
  | { type: 'pressKey'; key: string; waitMs?: number }
  | { type: 'tapCanvas'; x: number; y: number; normalized?: boolean; waitMs?: number }
  | { type: 'waitFrames'; frames: number; jitterMs?: number }
  | { type: 'waitForState'; path: string; equals: boolean | number | string | null; timeoutMs?: number; pollMs?: number };

export interface MobileAutomationFlow {
  name: string;
  description: string;
  prelude: BrowserPreludeStep[];
  scenarioNames: string[];
}

export const MOBILE_AUTOMATION_FLOWS: Record<string, MobileAutomationFlow> = {
  campaign_level0: {
    name: 'campaign_level0',
    description: 'Enter campaign, start level 1, dismiss the intro, then run gameplay touch scenarios.',
    prelude: [
      { type: 'clickSelector', selector: '.menu-button.campaign', waitMs: 120 },
      { type: 'waitForState', path: 'screen', equals: 'levelSelect', timeoutMs: 4_000 },
      { type: 'pressKey', key: 'Enter', waitMs: 120 },
      { type: 'waitForState', path: 'screen', equals: 'playing', timeoutMs: 4_000 },
      { type: 'waitForState', path: 'intro', equals: true, timeoutMs: 2_000 },
      { type: 'tapCanvas', x: 0.5, y: 0.5, normalized: true, waitMs: 120 },
      { type: 'waitForState', path: 'intro', equals: false, timeoutMs: 2_000 },
    ],
    scenarioNames: [
      'aim_drag_dash_overlap',
      'swap_radial_buffered_attack',
      'pointer_leave_reenter',
      'rapid_element_swap_spam',
    ],
  },
};
