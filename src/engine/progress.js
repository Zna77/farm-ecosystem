// Progress: XP, levels, coins, discoveries, missions, achievements and
// the Farm Health score.

import { LEVEL_XP, MAX_LEVEL, PLOTS_BY_LEVEL } from '../config.js';
import { CROPS } from '../data/crops.js';
import { MISSIONS } from '../data/missions.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { DISCOVERY_MAP } from '../data/discoveries.js';
import { emit } from './bus.js';

/** Difficulty multiplier that grows with the player's level. */
export const levelFactor = (state) => 1 + (state.level - 1) * 0.08;

export const unlockedPlots = (state) => state.plots.slice(0, PLOTS_BY_LEVEL[state.level]);
export const isPlotUnlocked = (state, id) => id < PLOTS_BY_LEVEL[state.level];

export function addCoins(state, n) {
  state.coins = Math.max(0, state.coins + n);
}

export function addXP(state, n) {
  state.xp += n;
  while (state.level < MAX_LEVEL && state.xp >= LEVEL_XP[state.level + 1]) {
    state.level += 1;
    const newCrops = Object.values(CROPS).filter((c) => c.level === state.level);
    emit('levelUp', { level: state.level, newCrops, plots: PLOTS_BY_LEVEL[state.level] });
  }
}

/** XP progress inside the current level, 0 → 1. */
export function levelProgress(state) {
  if (state.level >= MAX_LEVEL) return 1;
  const from = LEVEL_XP[state.level];
  const to = LEVEL_XP[state.level + 1];
  return Math.min(1, (state.xp - from) / (to - from));
}

/** Unlock an ecosystem discovery (only the first time). */
export function discover(state, id) {
  if (state.discoveries.includes(id) || !DISCOVERY_MAP[id]) return false;
  state.discoveries.push(id);
  addXP(state, 15);
  emit('discovery', { discovery: DISCOVERY_MAP[id] });
  return true;
}

export function currentMission(state) {
  return MISSIONS[state.missionIndex] || null;
}

export function missionProgress(state, mission = currentMission(state)) {
  if (!mission) return 0;
  return Math.min(mission.goal, mission.check(state));
}

/** Complete missions whose goal is reached. Can finish several in a row. */
export function checkMissions(state) {
  let mission = currentMission(state);
  while (mission && mission.check(state) >= mission.goal) {
    state.missionIndex += 1;
    emit('missionComplete', { mission, next: currentMission(state) }); // before XP so it shows before a level-up
    addCoins(state, mission.reward.coins);
    addXP(state, mission.reward.xp);
    mission = currentMission(state);
  }
}

export function checkAchievements(state) {
  for (const a of ACHIEVEMENTS) {
    if (!state.achievements.includes(a.id) && a.test(state)) {
      state.achievements.push(a.id);
      addXP(state, 20);
      emit('achievement', { achievement: a });
    }
  }
}

const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

/**
 * Farm Health (0-100) combines four parts of the ecosystem:
 *  soil (30%) – average fertility
 *  water (25%) – are planted crops drinking enough?
 *  pests (20%) – how few aphids there are
 *  life (25%) – biodiversity: bees, ladybugs, animals, compost, crop variety
 */
export function computeHealth(state) {
  const plots = unlockedPlots(state);
  const planted = plots.filter((p) => p.crop && !p.dead);

  const soil = avg(plots.map((p) => p.fertility));
  const water = planted.length
    ? avg(planted.map((p) => (p.wilted ? 0 : Math.min(100, (p.water / 40) * 100))))
    : 75;
  const pests = planted.length ? 100 - avg(planted.map((p) => p.aphids)) : 100;

  const variety = new Set(planted.map((p) => p.crop)).size;
  let life = 0;
  if (state.hives > 0) life += 30 * (state.beeHealth / 100);
  if (state.ladybugs > 0) life += 20;
  if (state.animals.length > 0) life += 20;
  if (state.compost.organic + state.compost.ready > 0 || state.stats.compostApplied > 0) life += 15;
  life += Math.min(15, variety * 5);

  const deadPenalty = plots.filter((p) => p.dead).length * 5;
  const score = soil * 0.3 + water * 0.25 + pests * 0.2 + life * 0.25 - deadPenalty;
  const health = Math.round(Math.max(0, Math.min(100, score)));
  state.farmHealth = health;
  return { health, soil: Math.round(soil), water: Math.round(water), pests: Math.round(pests), life: Math.round(life) };
}

/** Run after every tick or player action. */
export function updateProgress(state) {
  computeHealth(state);
  checkMissions(state);
  checkAchievements(state);
}
