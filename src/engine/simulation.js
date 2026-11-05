// The ecosystem simulation. `tick()` runs once per simulated second and
// updates everything that happens by itself: sun, weather, water,
// growth, bees, aphids, ladybugs, animals and the compost bin.
//
// `rng` is a random-number function so tests can make it predictable.

import * as C from '../config.js';
import { CROPS } from '../data/crops.js';
import { ANIMALS } from '../data/shop.js';
import { emit } from './bus.js';
import { t } from '../translations/index.js';
import { discover, levelFactor, unlockedPlots, updateProgress } from './progress.js';

// ── Helpers ──────────────────────────────────────────────────
export const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

export const dayTime = (state) => (state.time % C.DAY_LENGTH) / C.DAY_LENGTH;
export const isNight = (state) => dayTime(state) >= C.NIGHT_START;

export function stageOf(plot) {
  if (!plot.crop) return -1;
  let stage = 0;
  for (let i = 0; i < C.STAGE_AT.length; i++) if (plot.growth >= C.STAGE_AT[i]) stage = i;
  return stage;
}

export const isRipe = (plot) => !!plot.crop && !plot.dead && plot.growth >= 100;

/** Is this flower stuck waiting for a pollinator? */
export function waitingForBees(plot) {
  if (!plot.crop || plot.dead) return false;
  return CROPS[plot.crop].needsBees && !plot.pollinated && plot.growth >= C.POLLINATION_GATE;
}

/** How much sunlight plants get right now (0-1.1). */
export function sunlight(state) {
  return isNight(state) ? 0.15 : C.WEATHER[state.weather].sun;
}

/** Growth multipliers. Each factor teaches one ecosystem rule. */
export function growthFactors(state, plot) {
  const sun = sunlight(state);
  const water = plot.wilted ? 0 : plot.water < C.THIRSTY_WATER ? 0.5 : 1;
  const soil = plot.fertility < 20 ? 0.35 : plot.fertility < 45 ? 0.7 : plot.fertility > 80 ? 1.15 : 1;
  const pests = 1 - plot.aphids / 140;
  return { sun, water, soil, pests, total: sun * water * soil * pests };
}

// ── Weather ──────────────────────────────────────────────────
export function pickWeather(state, rng) {
  const r = rng();
  if (state.level >= 3 && r < 0.1) return 'heatwave';
  if (r < 0.5) return 'sunny';
  if (r < 0.75) return 'cloudy';
  return 'rainy';
}

function updateWeather(state, rng) {
  state.weatherTimer -= 1;
  if (state.weatherTimer > 0) return;
  const before = state.weather;
  let next = pickWeather(state, rng);
  if (next === before) next = pickWeather(state, rng); // encourage variety
  state.weather = next;
  state.weatherTimer = 35 + Math.floor(rng() * 30);
  if (next !== before) emit('weather', { weather: next });
  if (next === 'rainy') {
    state.stats.rainSeen += 1;
    discover(state, 'rain');
  }
}

// ── Plots: water, wilting, growth, pollination, aphids ───────
function updatePlot(state, plot, rng, ctx) {
  const w = C.WEATHER[state.weather];
  const night = isNight(state);

  // 1. Water: the sun dries the soil, rain fills it, irrigation helps.
  if (w.drain < 0) {
    plot.water += -w.drain;
  } else {
    const base = plot.crop && !plot.dead ? C.BASE_DRAIN : C.EMPTY_DRAIN;
    plot.water -= base * w.drain * (night ? 0.5 : 1) * levelFactor(state);
  }
  if (state.irrigation && plot.water < 65) plot.water += C.IRRIGATION_RATE;
  plot.water = clamp(plot.water);

  if (!plot.crop || plot.dead) return;
  const crop = CROPS[plot.crop];

  // 2. Wilting: plants are mostly water.
  if (plot.water < C.WILT_WATER) {
    if (!plot.wilted) {
      plot.wilted = true;
      emit('float', { plotId: plot.id, text: t('msg.thirsty') });
      discover(state, 'wilt');
    }
    plot.wiltTicks += 1;
    if (plot.wiltTicks >= C.WILT_DEATH_TICKS) {
      plot.dead = true;
      plot.wilted = false;
      emit('plantDied', { plotId: plot.id, crop: crop.id });
    }
    return;
  } else if (plot.wilted && plot.water >= C.WILT_WATER + 10) {
    plot.wilted = false;
    plot.wiltTicks = 0;
  }

  if (isRipe(plot)) return;

  // 3. Pollination gate: bee-loving crops wait as flowers.
  if (waitingForBees(plot)) {
    tryPollinate(state, plot, rng, ctx);
  } else {
    // 4. Growth from photosynthesis.
    const f = growthFactors(state, plot);
    const before = stageOf(plot);
    plot.growth = Math.min(100, plot.growth + (100 / crop.growTime) * f.total);
    if (crop.needsBees && !plot.pollinated) plot.growth = Math.min(plot.growth, C.POLLINATION_GATE);
    if (!night && state.weather !== 'rainy' && f.total > 0.5) ctx.photosynthesis = true;
    if (f.soil < 1) ctx.poorSoil = true;

    const after = stageOf(plot);
    if (after !== before) emit('stage', { plotId: plot.id, stage: after });
    if (isRipe(plot)) {
      emit('float', { plotId: plot.id, text: t('msg.ready', { emoji: crop.emoji }) });
      if (crop.id === 'wheat') discover(state, 'wind');
    }
  }

  // 5. Aphids appear on plants after a grace period.
  if (plot.aphids === 0 && plot.growth >= C.STAGE_AT[1] && state.time > C.PEST_GRACE_TICKS) {
    if (rng() < C.APHID_SPAWN * (1 + (state.level - 1) * 0.3)) {
      plot.aphids = 5;
      emit('float', { plotId: plot.id, text: t('msg.aphidsArrived') });
      discover(state, 'aphids');
    }
  } else if (plot.aphids > 0) {
    plot.aphids = clamp(plot.aphids + C.APHID_GROWTH * (1 + (state.level - 1) * 0.1));
  }
}

function tryPollinate(state, plot, rng, ctx) {
  if (state.weather === 'rainy' || isNight(state)) return; // bees stay home
  const beePower = state.hives * C.HIVE_POLLINATION * (state.beeHealth / 100);
  const flowerBonus = ctx.sunflowers * 0.012 * (state.hives > 0 ? 1 : 0.3);
  const chance = C.WILD_POLLINATION + beePower + flowerBonus;
  plot.waitTicks += 1;
  if (rng() < chance) {
    plot.pollinated = true;
    plot.waitTicks = 0;
    state.stats.pollinated += 1;
    emit('pollinated', { plotId: plot.id, byBee: state.hives > 0 });
    emit('float', { plotId: plot.id, text: t('msg.pollinated') });
    discover(state, 'pollination');
  } else if (state.hives === 0 && plot.waitTicks > 20) {
    discover(state, 'nobees');
  }
}

// ── Predators: ladybugs and chickens eat aphids ─────────────
function updatePredators(state, plots) {
  const chickens = state.animals.filter((a) => a.type === 'chicken').length;
  const ladyPower = state.ladybugs * C.LADYBUG_APPETITE;
  const chickenPower = chickens * C.CHICKEN_APPETITE;
  const capacity = ladyPower + chickenPower;
  const infested = plots.filter((p) => p.aphids > 0 && p.crop);

  if (capacity > 0 && infested.length) {
    let eaten = 0;
    const share = capacity / infested.length;
    for (const p of infested) {
      const bite = Math.min(p.aphids, share);
      p.aphids = clamp(p.aphids - bite);
      if (p.aphids < 0.5) p.aphids = 0;
      eaten += bite;
    }
    const ladyEaten = eaten * (ladyPower / capacity);
    state.stats.aphidsEaten += ladyEaten;
    if (ladyEaten > 0) discover(state, 'ladybugs');
    if (chickenPower > 0) discover(state, 'chickensBugs');
  }

  // Predators need prey: with nothing to eat, some ladybugs leave.
  const anyAphids = plots.some((p) => p.aphids > 0);
  if (state.ladybugs > 0 && !anyAphids) {
    state.ladybugIdle += 1;
    if (state.ladybugIdle >= 60 && state.ladybugs > 2) {
      state.ladybugs -= 1;
      state.ladybugIdle = 0;
      emit('toast', { text: t('msg.ladybugLeft') });
      discover(state, 'predatorPrey');
    }
  } else {
    state.ladybugIdle = 0;
  }
}

// ── Animals ─────────────────────────────────────────────────
function updateAnimals(state) {
  state.animals.forEach((a, index) => {
    const def = ANIMALS[a.type];
    a.hunger = clamp(a.hunger + def.hungerRate);
    if (a.hunger < 70 && !a.ready) {
      a.progress += 1;
      if (a.progress >= def.productTime) {
        a.ready = true;
        a.progress = 0;
        emit('animalReady', { index });
      }
    }
    if (a.hunger < 85) {
      a.manure += 1;
      if (a.manure >= def.manureEvery) {
        a.manure = 0;
        if (state.compost.organic < C.MAX_ORGANIC) state.compost.organic += 1;
        discover(state, 'manure');
      }
    }
  });
}

// ── Compost bin: decomposers at work ────────────────────────
function updateCompost(state) {
  const bin = state.compost;
  if (bin.organic <= 0) return;
  bin.progress += C.COMPOST_RATE * (state.weather === 'rainy' ? 1.3 : 1);
  if (bin.progress >= 1) {
    bin.progress -= 1;
    bin.organic -= 1;
    bin.ready = Math.min(10, bin.ready + 1);
    emit('compostReady', { ready: bin.ready });
    discover(state, 'decompose');
  }
}

// ── Bees ────────────────────────────────────────────────────
function updateBees(state, plots, ctx) {
  const recover = ctx.flowers > 0 ? 0.25 : 0.08;
  state.beeHealth = clamp(state.beeHealth + recover);
  if (ctx.sunflowers > 0 && state.hives > 0) discover(state, 'sunflowerBees');
}

/** Advance the world by one tick. */
export function tick(state, rng = Math.random) {
  const wasNight = isNight(state);
  state.time += 1;
  if (!wasNight && isNight(state)) {
    emit('night', {});
    discover(state, 'night');
  }
  if (wasNight && !isNight(state)) emit('morning', {});

  updateWeather(state, rng);

  const plots = unlockedPlots(state);
  const ctx = {
    photosynthesis: false,
    poorSoil: false,
    sunflowers: plots.filter((p) => p.crop === 'sunflower' && !p.dead && stageOf(p) >= 3).length,
    flowers: plots.filter((p) => p.crop && !p.dead && stageOf(p) >= 3).length,
  };

  for (const plot of plots) updatePlot(state, plot, rng, ctx);
  if (ctx.photosynthesis) discover(state, 'photosynthesis');
  if (ctx.poorSoil) discover(state, 'poorSoil');

  updatePredators(state, plots);
  updateBees(state, plots, ctx);
  updateAnimals(state);
  updateCompost(state);
  updateProgress(state);
}
