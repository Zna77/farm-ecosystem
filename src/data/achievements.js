// Badges that unlock once and stay forever.
// Title/description text: translations → achievements.<id>
import { localize } from '../translations/index.js';

const total = (obj) => Object.values(obj).reduce((a, b) => a + b, 0);

export const ACHIEVEMENTS = [
  { id: 'greenThumb', icon: '👍', test: (s) => s.stats.planted >= 10 },
  { id: 'bigHarvest', icon: '🧺', test: (s) => total(s.stats.harvested) >= 25 },
  { id: 'rescuer', icon: '🚑', test: (s) => s.stats.rescued >= 1 },
  { id: 'rainDance', icon: '🌧️', test: (s) => s.stats.rainSeen >= 1 },
  { id: 'pollinatorPal', icon: '🌸', test: (s) => s.stats.pollinated >= 10 },
  { id: 'bugBuddy', icon: '🐞', test: (s) => s.stats.aphidsEaten >= 100 },
  { id: 'soilScientist', icon: '🔬', test: (s) => s.stats.compostApplied >= 10 },
  { id: 'animalFriend', icon: '🐮', test: (s) => s.animals.length >= 3 },
  { id: 'natureWay', icon: '🍃', test: (s) => total(s.stats.harvested) >= 20 && s.stats.sprays === 0 },
  { id: 'quizWhiz', icon: '🧠', test: (s) => s.stats.quizCorrect >= 10 },
  { id: 'explorer', icon: '🔍', test: (s) => s.discoveries.length >= 12 },
  { id: 'richFarmer', icon: '💰', test: (s) => s.coins >= 300 },
  { id: 'master', icon: '👑', test: (s) => s.level >= 6 },
];

ACHIEVEMENTS.forEach((a) => localize(a, `achievements.${a.id}`, ['title', 'desc']));
