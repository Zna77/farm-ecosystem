// Ecosystem relationships the child discovers while playing.
// Each discovery is one arrow in the "Ecosystem Web" (from → to).
// They unlock automatically when the event happens in the game.
// Text: translations → discoveries.<id>.title/.text and nodes.<id>
import { localize, t } from '../translations/index.js';

export const WEB_NODES = {
  sun: { emoji: '☀️', x: 50, y: 9 },
  rain: { emoji: '🌧️', x: 85, y: 16 },
  water: { emoji: '💧', x: 85, y: 45 },
  plants: { emoji: '🌱', x: 50, y: 42 },
  bees: { emoji: '🐝', x: 15, y: 18 },
  aphids: { emoji: '🐛', x: 14, y: 50 },
  ladybugs: { emoji: '🐞', x: 14, y: 82 },
  soil: { emoji: '🟫', x: 50, y: 74 },
  worms: { emoji: '🪱', x: 70, y: 92 },
  compost: { emoji: '♻️', x: 86, y: 75 },
  animals: { emoji: '🐔', x: 30, y: 93 },
  spray: { emoji: '🧴', x: 30, y: 30 },
};

export const DISCOVERIES = [
  {
    id: 'photosynthesis', from: 'sun', to: 'plants',
  },
  {
    id: 'night', from: 'sun', to: 'plants',
  },
  {
    id: 'rain', from: 'rain', to: 'water',
  },
  {
    id: 'wilt', from: 'water', to: 'plants',
  },
  {
    id: 'pollination', from: 'bees', to: 'plants',
  },
  {
    id: 'nobees', from: 'bees', to: 'plants',
  },
  {
    id: 'sunflowerBees', from: 'plants', to: 'bees',
  },
  {
    id: 'wind', from: 'plants', to: 'plants',
  },
  {
    id: 'aphids', from: 'aphids', to: 'plants',
  },
  {
    id: 'ladybugs', from: 'ladybugs', to: 'aphids',
  },
  {
    id: 'predatorPrey', from: 'aphids', to: 'ladybugs',
  },
  {
    id: 'chickensBugs', from: 'animals', to: 'aphids',
  },
  {
    id: 'spray', from: 'spray', to: 'bees',
  },
  {
    id: 'soilUse', from: 'soil', to: 'plants',
  },
  {
    id: 'poorSoil', from: 'soil', to: 'plants',
  },
  {
    id: 'beans', from: 'plants', to: 'soil',
  },
  {
    id: 'decompose', from: 'worms', to: 'compost',
  },
  {
    id: 'compost', from: 'compost', to: 'soil',
  },
  {
    id: 'manure', from: 'animals', to: 'compost',
  },
  {
    id: 'animalsEat', from: 'plants', to: 'animals',
  },
  {
    id: 'deadPlant', from: 'plants', to: 'compost',
  },
  {
    id: 'irrigation', from: 'water', to: 'plants',
  },
];

for (const [id, node] of Object.entries(WEB_NODES)) Object.defineProperty(node, 'label', { get: () => t(`nodes.${id}`), enumerable: true });
DISCOVERIES.forEach((d) => localize(d, `discoveries.${d.id}`, ['title', 'text']));

export const DISCOVERY_MAP = Object.fromEntries(DISCOVERIES.map((d) => [d.id, d]));
