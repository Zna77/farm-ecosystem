// The whole game lives in one plain object called `state`.
// Because it is plain data, we can save it to localStorage as JSON
// and load it back later.

import {
  SAVE_KEY, SAVE_VERSION, PLOT_COUNT, START_COINS, START_WATER, START_FERTILITY,
} from '../config.js';

export function createPlot(id) {
  return {
    id,
    crop: null, // crop id or null when empty
    growth: 0, // 0 → 100 (ripe)
    water: START_WATER, // 0 → 100
    fertility: START_FERTILITY, // 0 → 100 soil nutrients
    aphids: 0, // 0 → 100 pest pressure
    pollinated: false,
    wilted: false,
    wiltTicks: 0,
    waitTicks: 0, // how long a flower has waited for a bee
    dead: false,
  };
}

export function createState() {
  return {
    version: SAVE_VERSION,
    coins: START_COINS,
    xp: 0,
    level: 1,
    time: 0,
    weather: 'sunny',
    weatherTimer: 50,
    plots: Array.from({ length: PLOT_COUNT }, (_, i) => createPlot(i)),
    hives: 0,
    beeHealth: 100,
    ladybugs: 0,
    ladybugIdle: 0,
    animals: [], // { type, hunger, progress, ready, manure }
    irrigation: false,
    barn: {}, // stored crops: { carrot: 2 }
    compost: { organic: 2, progress: 0, ready: 1 }, // the compost bin
    inventory: { compost: 0 }, // compost bags in your hands
    farmHealth: 70,
    missionIndex: 0,
    achievements: [],
    discoveries: [],
    quizMastered: [],
    seenIntro: false,
    settings: { sound: true, speed: 1 },
    stats: {
      planted: 0, watered: 0, harvested: {}, compostApplied: 0, pollinated: 0,
      aphidsEaten: 0, products: 0, sprays: 0, rescued: 0, rainSeen: 0,
      quizCorrect: 0, quizAnswered: 0,
    },
  };
}

/** Fill in any fields missing from an older save, so updates never break saves. */
function mergeDefaults(saved) {
  const base = createState();
  const merged = { ...base, ...saved };
  merged.stats = { ...base.stats, ...(saved.stats || {}) };
  merged.settings = { ...base.settings, ...(saved.settings || {}) };
  merged.compost = { ...base.compost, ...(saved.compost || {}) };
  merged.inventory = { ...base.inventory, ...(saved.inventory || {}) };
  merged.plots = base.plots.map((p, i) => ({ ...p, ...((saved.plots || [])[i] || {}) }));
  return merged;
}

export function loadState(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(SAVE_KEY);
    if (!raw) return createState();
    return mergeDefaults(JSON.parse(raw));
  } catch (err) {
    console.warn('Could not load save, starting fresh.', err);
    return createState();
  }
}

export function saveState(state, storage = globalThis.localStorage) {
  try {
    storage?.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false; // private mode or storage full – the game still works
  }
}

export function clearSave(storage = globalThis.localStorage) {
  try { storage?.removeItem(SAVE_KEY); } catch { /* ignore */ }
}
