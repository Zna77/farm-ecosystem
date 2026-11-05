// Missions are done one after another. Each has a `check(state)` that
// returns the current progress number, and a `goal` to reach.
// `title`, `desc` and `lesson` (WHY the mission matters) come from the
// translations: missions.<id>.title / .desc / .lesson
import { localize } from '../translations/index.js';

const harvested = (s, crop) => s.stats.harvested[crop] || 0;
const totalHarvested = (s) => Object.values(s.stats.harvested).reduce((a, b) => a + b, 0);

export const MISSIONS = [
  {
    id: 'firstSeed', icon: '🌱',
    goal: 1, check: (s) => s.stats.planted,
    reward: { coins: 10, xp: 10 },
  },
  {
    id: 'water', icon: '💧',
    goal: 3, check: (s) => s.stats.watered,
    reward: { coins: 10, xp: 10 },
  },
  {
    id: 'carrots', icon: '🥕',
    goal: 3, check: (s) => harvested(s, 'carrot'),
    reward: { coins: 15, xp: 20 },
  },
  {
    id: 'compost', icon: '♻️',
    goal: 1, check: (s) => s.stats.compostApplied,
    reward: { coins: 15, xp: 20 },
  },
  {
    id: 'hive', icon: '🐝',
    goal: 1, check: (s) => s.hives,
    reward: { coins: 15, xp: 20 },
  },
  {
    id: 'tomatoes', icon: '🍅',
    goal: 2, check: (s) => harvested(s, 'tomato'),
    reward: { coins: 20, xp: 30 },
  },
  {
    id: 'ladybugs', icon: '🐞',
    goal: 20, check: (s) => Math.floor(s.stats.aphidsEaten),
    reward: { coins: 20, xp: 30 },
  },
  {
    id: 'chicken', icon: '🥚',
    goal: 1, check: (s) => s.stats.products,
    reward: { coins: 20, xp: 30 },
  },
  {
    id: 'beans', icon: '🫘',
    goal: 3, check: (s) => harvested(s, 'bean'),
    reward: { coins: 25, xp: 40 },
  },
  {
    id: 'health', icon: '💚',
    goal: 80, check: (s) => s.farmHealth,
    reward: { coins: 30, xp: 50 },
  },
  {
    id: 'pumpkin', icon: '🎃',
    goal: 1, check: (s) => harvested(s, 'pumpkin'),
    reward: { coins: 40, xp: 60 },
  },
  {
    id: 'master', icon: '🏆',
    goal: 40, check: totalHarvested,
    reward: { coins: 60, xp: 100 },
  },
];

MISSIONS.forEach((m) => localize(m, `missions.${m.id}`, ['title', 'desc', 'lesson']));
