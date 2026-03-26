import type { GestureScenario } from './gestureContract';

export const MOBILE_TEST_SCENARIOS: Record<string, GestureScenario> = {
  aim_drag_dash_overlap: {
    name: 'aim_drag_dash_overlap',
    description: 'Aim drag remains locked while dash double-tap overlaps on the movement side.',
    steps: [
      { batchContacts: [{ id: 1, phase: 'start', x: 900, y: 560 }] },
      { batchContacts: [{ id: 1, phase: 'move', x: 980, y: 520 }], waitFrames: 1 },
      { batchContacts: [{ id: 2, phase: 'start', x: 140, y: 560 }], waitFrames: 1 },
      { batchContacts: [{ id: 2, phase: 'end', x: 140, y: 560 }], waitFrames: 3, jitterMs: 4 },
      { batchContacts: [{ id: 3, phase: 'start', x: 148, y: 564 }], waitFrames: 4, jitterMs: 6 },
      { batchContacts: [{ id: 3, phase: 'end', x: 148, y: 564 }], waitFrames: 2 },
      { batchContacts: [{ id: 1, phase: 'end', x: 980, y: 520 }], waitFrames: 1 },
    ],
  },
  swap_radial_buffered_attack: {
    name: 'swap_radial_buffered_attack',
    description: 'Buffered attack remains queued while swap radial selection resolves on delayed release.',
    steps: [
      { batchContacts: [{ id: 1, phase: 'start', x: 1080, y: 620 }] },
      { batchContacts: [{ id: 2, phase: 'start', x: 1080, y: 520 }], waitFrames: 1 },
      { waitFrames: 24 },
      { batchContacts: [{ id: 2, phase: 'move', x: 1190, y: 520 }], jitterMs: 8 },
      { batchContacts: [{ id: 2, phase: 'end', x: 1190, y: 520 }], waitFrames: 2, jitterMs: 12 },
      { batchContacts: [{ id: 1, phase: 'end', x: 1080, y: 620 }], waitFrames: 1 },
    ],
  },
  pointer_leave_reenter: {
    name: 'pointer_leave_reenter',
    description: 'Aim pointer leaves the canvas bounds and re-enters before release.',
    steps: [
      { batchContacts: [{ id: 1, phase: 'start', x: 900, y: 560 }] },
      { batchContacts: [{ id: 1, phase: 'move', x: 1260, y: 430 }], waitFrames: 1 },
      { batchContacts: [{ id: 1, phase: 'move', x: 1030, y: 470 }], waitFrames: 2, jitterMs: 10 },
      { batchContacts: [{ id: 1, phase: 'end', x: 1030, y: 470 }], waitFrames: 1 },
    ],
  },
  system_interrupt_cancel: {
    name: 'system_interrupt_cancel',
    description: 'Gesture is canceled by the system while another ownership path remains active.',
    steps: [
      { batchContacts: [{ id: 1, phase: 'start', x: 140, y: 560 }] },
      { batchContacts: [{ id: 2, phase: 'start', x: 900, y: 560 }], waitFrames: 1 },
      { batchContacts: [{ id: 1, phase: 'cancel', x: 160, y: 540 }], waitFrames: 2 },
      { batchContacts: [{ id: 2, phase: 'move', x: 990, y: 510 }], waitFrames: 1 },
      { batchContacts: [{ id: 2, phase: 'end', x: 990, y: 510 }], waitFrames: 1 },
    ],
  },
  rapid_element_swap_spam: {
    name: 'rapid_element_swap_spam',
    description: 'Repeated swap button taps should cycle cleanly without stuck ownership or duplicate commands.',
    steps: [
      { batchContacts: [{ id: 1, phase: 'start', x: 1080, y: 520 }], waitFrames: 1 },
      { batchContacts: [{ id: 1, phase: 'end', x: 1080, y: 520 }], waitFrames: 2 },
      { batchContacts: [{ id: 2, phase: 'start', x: 1080, y: 520 }], waitFrames: 1, jitterMs: 6 },
      { batchContacts: [{ id: 2, phase: 'end', x: 1080, y: 520 }], waitFrames: 2 },
      { batchContacts: [{ id: 3, phase: 'start', x: 1080, y: 520 }], waitFrames: 1, jitterMs: 8 },
      { batchContacts: [{ id: 3, phase: 'end', x: 1080, y: 520 }], waitFrames: 2 },
      { batchContacts: [{ id: 4, phase: 'start', x: 1080, y: 520 }], waitFrames: 1 },
      { batchContacts: [{ id: 4, phase: 'end', x: 1080, y: 520 }], waitFrames: 2 },
    ],
  },
};
