export function setMockStorage(seed: Record<string, string> = {}): Storage {
  const store = new Map<string, string>(Object.entries(seed));

  const storage: Storage = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    writable: true,
    value: storage,
  });

  return storage;
}

export function withMockedRandom<T>(value: number, fn: () => T): T {
  const prev = Math.random;
  Math.random = () => value;
  try {
    return fn();
  } finally {
    Math.random = prev;
  }
}

export function setMockAudioContext(): void {
  class FakeParam {
    value = 0;
    setValueAtTime(value: number): void { this.value = value; }
    exponentialRampToValueAtTime(value: number): void { this.value = value; }
  }

  class FakeGainNode {
    gain = new FakeParam();
    connect(): void { /* noop */ }
  }

  class FakeOscillatorNode {
    type: OscillatorType = 'sine';
    frequency = new FakeParam();
    detune = new FakeParam();
    connect(): void { /* noop */ }
    start(): void { /* noop */ }
    stop(): void { /* noop */ }
  }

  class FakeAudioBuffer {
    constructor(private readonly size: number) {}
    getChannelData(): Float32Array {
      return new Float32Array(this.size);
    }
  }

  class FakeBufferSourceNode {
    buffer: FakeAudioBuffer | null = null;
    connect(): void { /* noop */ }
    start(): void { /* noop */ }
    stop(): void { /* noop */ }
  }

  class FakeBiquadFilterNode {
    type: BiquadFilterType = 'highpass';
    frequency = new FakeParam();
    connect(): void { /* noop */ }
  }

  class FakeAudioContext {
    state: AudioContextState = 'running';
    currentTime = 0;
    sampleRate = 44100;
    destination = {};

    createGain(): GainNode {
      return new FakeGainNode() as unknown as GainNode;
    }

    createOscillator(): OscillatorNode {
      return new FakeOscillatorNode() as unknown as OscillatorNode;
    }

    createBuffer(_channels: number, size: number): AudioBuffer {
      return new FakeAudioBuffer(size) as unknown as AudioBuffer;
    }

    createBufferSource(): AudioBufferSourceNode {
      return new FakeBufferSourceNode() as unknown as AudioBufferSourceNode;
    }

    createBiquadFilter(): BiquadFilterNode {
      return new FakeBiquadFilterNode() as unknown as BiquadFilterNode;
    }

    resume(): Promise<void> {
      return Promise.resolve();
    }
  }

  type GlobalWithWindow = typeof globalThis & { window?: Record<string, unknown> };
  const g = globalThis as GlobalWithWindow;

  if (!g.window) {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      writable: true,
      value: {},
    });
  }

  const win = (globalThis as GlobalWithWindow).window as Record<string, unknown>;
  const audioCtor = FakeAudioContext as unknown as typeof AudioContext;
  win.AudioContext = audioCtor;
  win.webkitAudioContext = audioCtor;
}
