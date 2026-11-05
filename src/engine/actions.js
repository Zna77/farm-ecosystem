// Player actions. Every function changes `state` and returns
// { ok: boolean, msg: string } – `msg` is a kid-friendly explanation
// (already translated with t()) that the UI shows to the player.

import * as C from '../config.js';
import { CROPS } from '../data/crops.js';
import { SHOP, ANIMALS } from '../data/shop.js';
import { t } from '../translations/index.js';
import { emit } from './bus.js';
import { addCoins, addXP, discover, isPlotUnlocked, updateProgress } from './progress.js';
import { clamp, isRipe } from './simulation.js';

const ok = (key, params, extra = {}) => ({ ok: true, msg: t(key, params), ...extra });
const fail = (key, params) => ({ ok: false, msg: t(key, params) });

function finish(state, result) {
  updateProgress(state);
  return result;
}

const getPlot = (state, plotId) => state.plots[plotId] || null;

export function plant(state, plotId, cropId) {
  const plot = getPlot(state, plotId);
  const crop = CROPS[cropId];
  if (!plot || !crop) return fail('msg.generic');
  if (!isPlotUnlocked(state, plotId)) return fail('msg.fieldLocked');
  if (plot.crop) return fail('msg.occupied');
  if (state.level < crop.level) return fail('msg.cropLocked', { crop: crop.name, n: crop.level });
  if (state.coins < crop.seedCost) return fail('msg.noCoinsSeed');

  addCoins(state, -crop.seedCost);
  Object.assign(plot, {
    crop: cropId, growth: 0, aphids: 0, pollinated: false,
    wilted: false, wiltTicks: 0, waitTicks: 0, dead: false,
  });
  state.stats.planted += 1;
  addXP(state, 2);
  emit('planted', { plotId, crop: cropId });
  return finish(state, ok('msg.planted', { crop: crop.name }));
}

export function water(state, plotId) {
  const plot = getPlot(state, plotId);
  if (!plot || !isPlotUnlocked(state, plotId)) return fail('msg.fieldLockedShort');
  if (plot.water >= 95) return fail('msg.soaked');
  const wasWilted = plot.wilted;
  plot.water = clamp(plot.water + C.WATER_AMOUNT);
  if (plot.wilted && plot.water >= C.WILT_WATER + 10) {
    plot.wilted = false;
    plot.wiltTicks = 0;
  }
  state.stats.watered += 1;
  if (wasWilted && !plot.wilted) state.stats.rescued += 1;
  addXP(state, 1);
  emit('watered', { plotId });
  return finish(state, ok(wasWilted ? 'msg.rescued' : 'msg.watered'));
}

export function harvest(state, plotId) {
  const plot = getPlot(state, plotId);
  if (!plot || !plot.crop) return fail('msg.nothingToHarvest');

  // Clearing a dead plant: it goes to the compost bin.
  if (plot.dead) {
    plot.crop = null;
    plot.dead = false;
    plot.growth = 0;
    plot.aphids = 0;
    state.compost.organic = Math.min(C.MAX_ORGANIC, state.compost.organic + 2);
    discover(state, 'deadPlant');
    emit('cleared', { plotId });
    return finish(state, ok('msg.toCompost'));
  }
  if (!isRipe(plot)) return fail('msg.notRipe');

  const crop = CROPS[plot.crop];
  state.barn[crop.id] = (state.barn[crop.id] || 0) + 1;
  state.stats.harvested[crop.id] = (state.stats.harvested[crop.id] || 0) + 1;
  plot.fertility = clamp(plot.fertility - crop.soilUse);
  state.compost.organic = Math.min(C.MAX_ORGANIC, state.compost.organic + 1); // leaves & stems
  addXP(state, crop.xp);

  Object.assign(plot, { crop: null, growth: 0, aphids: 0, pollinated: false, wilted: false, wiltTicks: 0, waitTicks: 0 });
  emit('harvested', { plotId, crop: crop.id });

  // Beans add nitrogen to the soil; every other crop uses some up.
  const key = crop.soilUse < 0 ? 'msg.harvestBeans' : 'msg.harvestSoil';
  discover(state, crop.soilUse < 0 ? 'beans' : 'soilUse');
  return finish(state, ok(key, { emoji: crop.emoji }, { crop: crop.id }));
}

/** Take finished compost out of the bin. */
export function collectCompost(state) {
  const bin = state.compost;
  if (bin.ready <= 0) return fail(bin.organic > 0 ? 'msg.stillMunching' : 'msg.binEmpty');
  const count = bin.ready;
  state.inventory.compost += count;
  bin.ready = 0;
  emit('compostCollected', { n: count });
  return finish(state, ok('msg.compostCollected', { count }));
}

export function applyCompost(state, plotId) {
  const plot = getPlot(state, plotId);
  if (!plot || !isPlotUnlocked(state, plotId)) return fail('msg.fieldLockedShort');
  if (state.inventory.compost <= 0) return fail('msg.noBags');
  if (plot.fertility >= 98) return fail('msg.alreadyRich');
  state.inventory.compost -= 1;
  plot.fertility = clamp(plot.fertility + C.COMPOST_FERTILITY);
  state.stats.compostApplied += 1;
  addXP(state, 3);
  discover(state, 'compost');
  emit('composted', { plotId });
  return finish(state, ok('msg.composted'));
}

export function spray(state, plotId) {
  const plot = getPlot(state, plotId);
  if (!plot || plot.aphids <= 0) return fail('msg.noAphids');
  if (state.coins < C.SPRAY_COST) return fail('msg.noCoinsSpray');
  addCoins(state, -C.SPRAY_COST);
  plot.aphids = 0;
  state.ladybugs = Math.floor(state.ladybugs * 0.5);
  state.beeHealth = clamp(state.beeHealth - 25);
  state.stats.sprays += 1;
  discover(state, 'spray');
  emit('sprayed', { plotId });
  return finish(state, ok('msg.sprayed'));
}

export function buy(state, itemId) {
  const item = SHOP.find((s) => s.id === itemId);
  if (!item) return fail('msg.unknownItem');
  if (state.level < item.level) return fail('msg.levelReq', { n: item.level });
  if (state.coins < item.price) return fail('msg.noCoinsBuy');

  if (itemId === 'hive' && state.hives >= C.MAX_HIVES) return fail('msg.hivesFull');
  if (itemId === 'irrigation' && state.irrigation) return fail('msg.hasIrrigation');
  if (ANIMALS[itemId]) {
    const count = state.animals.filter((a) => a.type === itemId).length;
    if (count >= ANIMALS[itemId].max) return fail('msg.penFull');
  }

  addCoins(state, -item.price);
  let result = ok('msg.gotItem', { emoji: item.emoji, item: item.name });
  if (itemId === 'hive') {
    state.hives += 1;
    result = ok('msg.gotHive');
  } else if (itemId === 'ladybugs') {
    state.ladybugs += 5;
    result = ok('msg.gotLadybugs');
  } else if (itemId === 'irrigation') {
    state.irrigation = true;
    discover(state, 'irrigation');
    result = ok('msg.gotIrrigation');
  } else if (ANIMALS[itemId]) {
    state.animals.push({ type: itemId, hunger: 20, progress: 0, ready: false, manure: 0 });
    result = ok('msg.gotAnimal', { emoji: item.emoji });
  }
  emit('bought', { itemId });
  return finish(state, result);
}

/** Move a beehive away – shows what happens without pollinators. */
export function removeHive(state) {
  if (state.hives <= 0) return fail('msg.noHives');
  state.hives -= 1;
  addCoins(state, 15);
  emit('hiveRemoved', {});
  return finish(state, ok('msg.hiveRemoved'));
}

export function feedAnimal(state, index) {
  const animal = state.animals[index];
  if (!animal) return fail('msg.noAnimal');
  const def = ANIMALS[animal.type];
  if (animal.hunger < 15) return fail('msg.full', { emoji: def.emoji });
  const food = def.eats.find((c) => (state.barn[c] || 0) > 0);
  if (!food) return fail('msg.noFood', { emoji: def.emoji, food: `${CROPS[def.eats[0]].emoji} ${CROPS[def.eats[0]].name}` });
  state.barn[food] -= 1;
  animal.hunger = clamp(animal.hunger - 60);
  addXP(state, 2);
  discover(state, 'animalsEat');
  emit('fed', { index, food });
  return finish(state, ok('msg.fed', { emoji: def.emoji, food: CROPS[food].emoji }));
}

export function collectProduct(state, index) {
  const animal = state.animals[index];
  if (!animal) return fail('msg.noAnimal');
  const def = ANIMALS[animal.type];
  if (!animal.ready) {
    return fail(animal.hunger >= 70 ? 'msg.tooHungry' : 'msg.stillMaking', { emoji: def.emoji, product: def.product });
  }
  animal.ready = false;
  addCoins(state, def.productPrice);
  addXP(state, 4);
  state.stats.products += 1;
  emit('collected', { index, product: def.product });
  return finish(state, ok('msg.collected', { emoji: def.productEmoji, n: def.productPrice }));
}

export function sell(state, cropId) {
  const ids = cropId === 'all' ? Object.keys(state.barn) : [cropId];
  let earned = 0;
  let count = 0;
  for (const id of ids) {
    const n = state.barn[id] || 0;
    if (!n || !CROPS[id]) continue;
    earned += n * CROPS[id].sellPrice;
    count += n;
    state.barn[id] = 0;
  }
  if (!count) return fail('msg.barnEmpty');
  addCoins(state, earned);
  emit('sold', { earned, count });
  return finish(state, ok('msg.sold', { count, coins: earned }));
}
