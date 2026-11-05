// Every crop the player can grow.
// growTime   – ticks to grow from seed to ripe in perfect conditions
// needsBees  – true if flowers must be pollinated before fruit appears
// soilUse    – fertility taken from the soil when harvested (negative = adds nutrients!)
// shape      – which drawing to use (see ui/art.js)
// name, fact – translated text, see src/translations/*.js → crops.<id>

import { localize } from '../translations/index.js';

export const CROPS = {
  carrot: {
    id: 'carrot', emoji: '🥕', level: 1,
    seedCost: 3, sellPrice: 8, xp: 6, growTime: 35,
    needsBees: false, soilUse: 12, shape: 'leafy',
    leaf: '#4caf50', flower: '#fff8e1',
  },
  wheat: {
    id: 'wheat', emoji: '🌾', level: 1,
    seedCost: 2, sellPrice: 6, xp: 5, growTime: 40,
    needsBees: false, soilUse: 10, shape: 'grass',
    leaf: '#8bc34a', flower: '#e6c35c',
  },
  bean: {
    id: 'bean', emoji: '🫘', level: 2,
    seedCost: 3, sellPrice: 6, xp: 7, growTime: 40,
    needsBees: false, soilUse: -12, shape: 'vine',
    leaf: '#66bb6a', flower: '#f8bbd0',
  },
  tomato: {
    id: 'tomato', emoji: '🍅', level: 2,
    seedCost: 5, sellPrice: 14, xp: 10, growTime: 55,
    needsBees: true, soilUse: 15, shape: 'vine',
    leaf: '#43a047', flower: '#ffeb3b',
  },
  strawberry: {
    id: 'strawberry', emoji: '🍓', level: 3,
    seedCost: 5, sellPrice: 12, xp: 10, growTime: 50,
    needsBees: true, soilUse: 12, shape: 'bush',
    leaf: '#2e7d32', flower: '#ffffff',
  },
  sunflower: {
    id: 'sunflower', emoji: '🌻', level: 3,
    seedCost: 4, sellPrice: 10, xp: 9, growTime: 50,
    needsBees: true, soilUse: 12, shape: 'tall',
    leaf: '#558b2f', flower: '#ffc107',
  },
  pumpkin: {
    id: 'pumpkin', emoji: '🎃', level: 4,
    seedCost: 8, sellPrice: 28, xp: 18, growTime: 75,
    needsBees: true, soilUse: 20, shape: 'sprawl',
    leaf: '#689f38', flower: '#ffa000',
  },
};

for (const crop of Object.values(CROPS)) localize(crop, `crops.${crop.id}`, ['name', 'fact']);

export const CROP_LIST = Object.values(CROPS);
