import {
  handleTouchEnd,
  handleTouchMove,
  handleTouchStart,
  updateTouchControlsInput,
  type TouchControlsState,
} from '../touchControls';
import type { GameState } from '../types';
import {
  createInputContactRegistry,
  listInputContacts,
  removeInputContact,
  upsertInputContact,
  type InputContact,
} from '../mobile/pointerBridge';
import { normalizeGestureScenario, type GestureScenario } from '../mobile/gestureContract';

type SyntheticEventType = 'start' | 'move' | 'end';

interface ScheduledSyntheticEvent {
  dueAt: number;
  type: SyntheticEventType;
  contact: InputContact;
}

export class SyntheticMultiTouchDriver {
  private readonly registry = createInputContactRegistry();
  private readonly queue: ScheduledSyntheticEvent[] = [];
  private delayedRule: { type: SyntheticEventType; identifier?: number; frames: number } | null = null;
  private droppedRule: { type: SyntheticEventType; identifier?: number } | null = null;
  nowMs = 0;

  constructor(
    private readonly state: GameState,
    private readonly controls: TouchControlsState,
    private readonly canvas: HTMLCanvasElement,
    private readonly canvasW: number,
    private readonly canvasH: number,
  ) {}

  start(identifier: number, x: number, y: number): void {
    this.enqueue('start', { identifier, clientX: x, clientY: y });
  }

  move(identifier: number, x: number, y: number): void {
    this.enqueue('move', { identifier, clientX: x, clientY: y });
  }

  end(identifier: number, x: number, y: number): void {
    this.enqueue('end', { identifier, clientX: x, clientY: y });
  }

  delayNext(type: SyntheticEventType, frames: number, identifier?: number): void {
    this.delayedRule = { type, frames, identifier };
  }

  dropNext(type: SyntheticEventType, identifier?: number): void {
    this.droppedRule = { type, identifier };
  }

  advanceTimings(frameTimings: number[]): void {
    for (const timing of frameTimings) {
      this.step(timing);
    }
  }

  runScenario(scenario: GestureScenario): void {
    const normalized = normalizeGestureScenario(scenario);
    for (const step of normalized.steps) {
      for (const contact of step.batchContacts ?? []) {
        if (contact.phase === 'start') {
          this.start(contact.id, contact.x, contact.y);
        } else if (contact.phase === 'move') {
          this.move(contact.id, contact.x, contact.y);
        } else {
          this.enqueue(contact.phase === 'cancel' ? 'end' : 'end', {
            identifier: contact.id,
            clientX: contact.x,
            clientY: contact.y,
          });
        }
      }
      const frameMs = 16.67 + (step.jitterMs ?? 0);
      this.advanceTimings(Array.from({ length: step.waitFrames ?? 1 }, () => frameMs));
    }
  }

  step(frameMs = 16.67): void {
    this.nowMs += frameMs;
    this.flushDueEvents();
    updateTouchControlsInput(this.controls, this.state);
  }

  private enqueue(type: SyntheticEventType, contact: InputContact): void {
    if (
      this.droppedRule
      && this.droppedRule.type === type
      && (this.droppedRule.identifier === undefined || this.droppedRule.identifier === contact.identifier)
    ) {
      this.droppedRule = null;
      return;
    }

    let delayFrames = 0;
    if (
      this.delayedRule
      && this.delayedRule.type === type
      && (this.delayedRule.identifier === undefined || this.delayedRule.identifier === contact.identifier)
    ) {
      delayFrames = this.delayedRule.frames;
      this.delayedRule = null;
    }

    this.queue.push({
      dueAt: this.nowMs + delayFrames * 16.67,
      type,
      contact: { ...contact },
    });
    this.queue.sort((a, b) => a.dueAt - b.dueAt);
  }

  private flushDueEvents(): void {
    while (this.queue.length > 0 && this.queue[0].dueAt <= this.nowMs) {
      const next = this.queue.shift();
      if (!next) break;
      this.dispatch(next.type, next.contact);
    }
  }

  private dispatch(type: SyntheticEventType, contact: InputContact): void {
    if (type === 'start') {
      const changed = upsertInputContact(this.registry, contact.identifier, contact.clientX, contact.clientY);
      handleTouchStart(
        [changed],
        this.controls,
        this.state,
        this.canvas,
        this.canvasW,
        this.canvasH,
        undefined,
        listInputContacts(this.registry),
      );
      return;
    }

    if (type === 'move') {
      const changed = upsertInputContact(this.registry, contact.identifier, contact.clientX, contact.clientY);
      handleTouchMove(
        [changed],
        this.controls,
        this.state,
        this.canvas,
        this.canvasW,
        this.canvasH,
        undefined,
        listInputContacts(this.registry),
      );
      return;
    }

    upsertInputContact(this.registry, contact.identifier, contact.clientX, contact.clientY);
    const changed = removeInputContact(this.registry, contact.identifier) ?? contact;
    handleTouchEnd(
      [changed],
      this.controls,
      this.state,
      this.canvas,
      this.canvasW,
      this.canvasH,
      undefined,
      listInputContacts(this.registry),
    );
  }
}
