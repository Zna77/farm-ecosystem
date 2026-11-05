// A tiny event bus. The game engine *emits* events (e.g. "a plant wilted")
// and the UI *listens* to show animations, sounds and messages.
// This keeps game rules separate from drawing code.

const listeners = new Map();

export function on(type, fn) {
  if (!listeners.has(type)) listeners.set(type, new Set());
  listeners.get(type).add(fn);
  return () => listeners.get(type).delete(fn);
}

export function emit(type, payload = {}) {
  const set = listeners.get(type);
  if (set) set.forEach((fn) => fn(payload));
  const any = listeners.get('*');
  if (any) any.forEach((fn) => fn({ type, ...payload }));
}

export function clearListeners() {
  listeners.clear();
}
