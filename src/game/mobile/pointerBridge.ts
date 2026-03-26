export interface InputContact {
  identifier: number;
  clientX: number;
  clientY: number;
}

export interface InputContactRegistry {
  contacts: Map<number, InputContact>;
}

export function createInputContactRegistry(): InputContactRegistry {
  return {
    contacts: new Map(),
  };
}

export function upsertInputContact(
  registry: InputContactRegistry,
  identifier: number,
  clientX: number,
  clientY: number,
): InputContact {
  const existing = registry.contacts.get(identifier);
  if (existing) {
    existing.clientX = clientX;
    existing.clientY = clientY;
    return existing;
  }

  const next = { identifier, clientX, clientY };
  registry.contacts.set(identifier, next);
  return next;
}

export function removeInputContact(registry: InputContactRegistry, identifier: number): InputContact | null {
  const existing = registry.contacts.get(identifier);
  if (!existing) return null;
  const snapshot = { ...existing };
  registry.contacts.delete(identifier);
  return snapshot;
}

export function listInputContacts(registry: InputContactRegistry): InputContact[] {
  return Array.from(registry.contacts.values()).map((contact) => ({ ...contact }));
}

export function clearInputContacts(registry: InputContactRegistry): void {
  registry.contacts.clear();
}

export function isTouchPointerEvent(event: PointerEvent): boolean {
  return event.pointerType === 'touch';
}
