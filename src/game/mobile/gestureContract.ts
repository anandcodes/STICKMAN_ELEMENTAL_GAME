export type GestureContactPhase = 'start' | 'move' | 'end' | 'cancel';

export interface GestureContactFrame {
  id: number;
  phase: GestureContactPhase;
  x: number;
  y: number;
}

export interface GestureScenarioStep {
  waitFrames?: number;
  jitterMs?: number;
  batchContacts?: GestureContactFrame[];
  note?: string;
}

export interface GestureScenario {
  name: string;
  description: string;
  steps: GestureScenarioStep[];
}

export function normalizeGestureScenario(scenario: GestureScenario): GestureScenario {
  return {
    ...scenario,
    steps: scenario.steps.map((step) => ({
      waitFrames: step.waitFrames ?? 1,
      jitterMs: step.jitterMs ?? 0,
      batchContacts: step.batchContacts ? step.batchContacts.map((contact) => ({ ...contact })) : [],
      note: step.note,
    })),
  };
}
