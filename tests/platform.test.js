// Android in-app browsers can throw an error just for *reading* localStorage.
// The game must still start (it just can't save). Run with: npm test
import { describe, it, expect, afterEach } from 'vitest';
import { safeStorage } from '../src/platform.js';
import { loadState, saveState, clearSave } from '../src/engine/state.js';

const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
afterEach(() => {
  if (original) Object.defineProperty(globalThis, 'localStorage', original);
  else delete globalThis.localStorage;
});

describe('storage that throws (Android WebView with DOM storage disabled)', () => {
  it('does not crash when reading localStorage throws', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() { throw new Error('SecurityError: The operation is insecure.'); },
    });
    expect(safeStorage()).toBe(null);
    const state = loadState();
    expect(state.coins).toBeGreaterThan(0);
    expect(saveState(state)).toBe(false);
    expect(() => clearSave()).not.toThrow();
  });

  it('does not crash when localStorage is null', () => {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: null });
    expect(safeStorage()).toBe(null);
    expect(loadState().level).toBe(1);
  });
});
