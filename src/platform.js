// Small helpers that keep the game working in unusual browsers.

/** The global object, without relying on `globalThis` (Chrome 71+). */
export const root =
  typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : typeof global !== 'undefined' ? global : {};

/**
 * Get localStorage safely. In some Android in-app browsers (WebViews with DOM
 * storage disabled) and in Chrome with site data blocked, simply *reading*
 * `window.localStorage` throws an error. We return null instead, so the game
 * still runs – it just can't save.
 */
export function safeStorage() {
  try {
    const storage = root.localStorage;
    if (!storage) return null;
    const probe = '__farm_probe__';
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}
