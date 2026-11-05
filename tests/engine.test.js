// Unit tests for the game rules. Run with: npm test
import { describe, it, expect, beforeEach } from 'vitest';
import { createState, loadState, saveState } from '../src/engine/state.js';
import * as A from '../src/engine/actions.js';
import { tick, stageOf, isRipe, waitingForBees, growthFactors } from '../src/engine/simulation.js';
import { computeHealth, currentMission, addXP } from '../src/engine/progress.js';
import { clearListeners, on } from '../src/engine/bus.js';
import { POLLINATION_GATE } from '../src/config.js';

const never = () => 0.999; // rng that never triggers random events
const always = () => 0; // rng that always triggers them

function run(state, n, rng = never) {
  for (let i = 0; i < n; i++) tick(state, rng);
}

let s;
beforeEach(() => {
  clearListeners();
  s = createState();
  s.weatherTimer = 99999; // keep the weather fixed unless a test changes it
});

describe('planting & growth', () => {
  it('plants a seed and charges the seed cost', () => {
    const r = A.plant(s, 0, 'carrot');
    expect(r.ok).toBe(true);
    expect(s.plots[0].crop).toBe('carrot');
    expect(s.coins).toBe(60 + 10 - 3); // +10 reward for the first mission
    expect(currentMission(s).id).toBe('water');
  });

  it('refuses locked plots and locked crops', () => {
    expect(A.plant(s, 11, 'carrot').ok).toBe(false);
    expect(A.plant(s, 0, 'pumpkin').ok).toBe(false);
  });

  it('grows through stages to ripe when watered', () => {
    A.plant(s, 0, 'carrot');
    let maxStage = 0;
    for (let i = 0; i < 120 && !isRipe(s.plots[0]); i++) {
      if (s.plots[0].water < 50) A.water(s, 0);
      tick(s, never);
      maxStage = Math.max(maxStage, stageOf(s.plots[0]));
    }
    expect(isRipe(s.plots[0])).toBe(true);
    expect(maxStage).toBe(4);
  });

  it('grows slower at night (photosynthesis needs sun)', () => {
    const day = growthFactors(s, s.plots[0]).sun;
    s.time = 140; // night
    const night = growthFactors(s, s.plots[0]).sun;
    expect(night).toBeLessThan(day);
  });
});

describe('water & wilting', () => {
  it('plants wilt without water, then die', () => {
    A.plant(s, 0, 'carrot');
    s.plots[0].water = 16;
    run(s, 3);
    expect(s.plots[0].wilted).toBe(true);
    expect(s.discoveries).toContain('wilt');
    run(s, 45);
    expect(s.plots[0].dead).toBe(true);
  });

  it('watering rescues a wilted plant', () => {
    A.plant(s, 0, 'carrot');
    s.plots[0].water = 5;
    run(s, 1);
    expect(s.plots[0].wilted).toBe(true);
    A.water(s, 0);
    expect(s.plots[0].wilted).toBe(false);
    expect(s.stats.rescued).toBe(1);
  });

  it('rain refills the soil', () => {
    s.weather = 'rainy';
    s.plots[0].water = 20;
    run(s, 5);
    expect(s.plots[0].water).toBeGreaterThan(30);
  });

  it('irrigation keeps soil moist', () => {
    s.irrigation = true;
    s.weather = 'cloudy';
    A.plant(s, 0, 'wheat');
    s.plots[0].water = 30;
    run(s, 20);
    expect(s.plots[0].water).toBeGreaterThan(30);
  });
});

describe('soil & compost', () => {
  it('harvest uses soil nutrients, beans add them back', () => {
    s.level = 2;
    A.plant(s, 0, 'carrot');
    s.plots[0].growth = 100;
    const before = s.plots[0].fertility;
    A.harvest(s, 0);
    expect(s.plots[0].fertility).toBe(before - 12);

    A.plant(s, 1, 'bean');
    s.plots[1].growth = 100;
    A.harvest(s, 1);
    expect(s.plots[1].fertility).toBe(70 + 12);
    expect(s.discoveries).toContain('beans');
  });

  it('poor soil slows growth', () => {
    s.plots[0].fertility = 10;
    expect(growthFactors(s, s.plots[0]).soil).toBeLessThan(1);
  });

  it('decomposers turn organic matter into compost that feeds soil', () => {
    s.compost = { organic: 3, progress: 0, ready: 0 };
    run(s, 15);
    expect(s.compost.ready).toBeGreaterThan(0);
    expect(A.collectCompost(s).ok).toBe(true);
    s.plots[0].fertility = 30;
    A.applyCompost(s, 0);
    expect(s.plots[0].fertility).toBe(65);
    expect(s.discoveries).toContain('compost');
  });

  it('clearing a dead plant adds organic matter', () => {
    A.plant(s, 0, 'carrot');
    s.plots[0].dead = true;
    const before = s.compost.organic;
    A.harvest(s, 0);
    expect(s.plots[0].crop).toBe(null);
    expect(s.compost.organic).toBe(before + 2);
  });
});

describe('bees & pollination', () => {
  beforeEach(() => { s.level = 2; s.coins = 500; });

  it('bee crops wait at the flower stage until pollinated', () => {
    A.plant(s, 0, 'tomato');
    s.plots[0].growth = POLLINATION_GATE;
    s.plots[0].water = 100;
    run(s, 10, never);
    expect(waitingForBees(s.plots[0])).toBe(true);
    expect(s.plots[0].growth).toBe(POLLINATION_GATE);
  });

  it('hives pollinate flowers, then fruit grows', () => {
    A.buy(s, 'hive');
    A.plant(s, 0, 'tomato');
    s.plots[0].growth = POLLINATION_GATE;
    s.plots[0].water = 100;
    tick(s, always);
    expect(s.plots[0].pollinated).toBe(true);
    run(s, 30);
    expect(s.plots[0].growth).toBeGreaterThan(POLLINATION_GATE);
  });

  it('removing bees lowers the pollination chance (no bees discovery)', () => {
    A.plant(s, 0, 'tomato');
    s.plots[0].growth = POLLINATION_GATE;
    s.plots[0].water = 100;
    run(s, 25, never);
    expect(s.discoveries).toContain('nobees');
  });

  it('bees do not fly in the rain', () => {
    A.buy(s, 'hive');
    s.weather = 'rainy';
    A.plant(s, 0, 'tomato');
    s.plots[0].growth = POLLINATION_GATE;
    tick(s, always);
    expect(s.plots[0].pollinated).toBe(false);
  });
});

describe('pests & predators', () => {
  it('ladybugs eat aphids', () => {
    A.plant(s, 0, 'carrot');
    s.plots[0].aphids = 30;
    s.ladybugs = 5;
    run(s, 25);
    expect(s.plots[0].aphids).toBe(0);
    expect(s.stats.aphidsEaten).toBeGreaterThan(20);
  });

  it('aphids grow and slow plants when there are no predators', () => {
    A.plant(s, 0, 'carrot');
    s.plots[0].aphids = 10;
    run(s, 20);
    expect(s.plots[0].aphids).toBeGreaterThan(20);
    expect(growthFactors(s, s.plots[0]).pests).toBeLessThan(1);
  });

  it('bug spray kills aphids but harms bees and ladybugs', () => {
    A.plant(s, 0, 'carrot');
    s.plots[0].aphids = 40;
    s.ladybugs = 10;
    A.spray(s, 0);
    expect(s.plots[0].aphids).toBe(0);
    expect(s.ladybugs).toBe(5);
    expect(s.beeHealth).toBe(75);
  });
});

describe('animals', () => {
  it('chickens need food, lay eggs and make manure', () => {
    s.coins = 100;
    A.buy(s, 'chicken');
    s.barn.wheat = 2;
    expect(A.feedAnimal(s, 0).ok).toBe(true);
    expect(s.barn.wheat).toBe(1);
    run(s, 31);
    expect(s.animals[0].ready).toBe(true);
    const coins = s.coins;
    expect(A.collectProduct(s, 0).ok).toBe(true);
    expect(s.coins).toBeGreaterThan(coins);
    expect(s.discoveries).toContain('manure');
  });

  it('cannot feed without food in the barn', () => {
    s.coins = 100;
    A.buy(s, 'chicken');
    s.animals[0].hunger = 80;
    expect(A.feedAnimal(s, 0).ok).toBe(false);
  });
});

describe('progress', () => {
  it('levels up and fires an event', () => {
    let leveled = 0;
    on('levelUp', () => leveled++);
    addXP(s, 60);
    expect(s.level).toBe(2);
    expect(leveled).toBe(1);
  });

  it('farm health rewards a balanced ecosystem', () => {
    const poor = computeHealth(s).health;
    s.hives = 1; s.ladybugs = 5; s.animals.push({ type: 'chicken', hunger: 0, progress: 0, ready: false, manure: 0 });
    s.plots.forEach((p) => (p.fertility = 95));
    expect(computeHealth(s).health).toBeGreaterThan(poor);
  });

  it('saves and loads from storage', () => {
    const mem = { data: {}, getItem(k) { return this.data[k] ?? null; }, setItem(k, v) { this.data[k] = v; }, removeItem(k) { delete this.data[k]; } };
    s.coins = 123;
    A.plant(s, 2, 'wheat');
    saveState(s, mem);
    const loaded = loadState(mem);
    expect(loaded.coins).toBe(s.coins);
    expect(loaded.plots[2].crop).toBe('wheat');
  });

  it('sells crops from the barn', () => {
    s.barn = { carrot: 2, wheat: 1 };
    const r = A.sell(s, 'all');
    expect(r.ok).toBe(true);
    expect(s.coins).toBe(60 + 16 + 6);
  });
});

describe('quiz', () => {
  it('picks questions for the level and keeps the right answer after shuffling', async () => {
    const { pickQuestions } = await import('../src/ui/modals.js');
    const { QUIZZES } = await import('../src/data/quizzes.js');
    const qs = pickQuestions(s, 5);
    expect(qs).toHaveLength(5);
    for (const q of qs) {
      const original = QUIZZES.find((x) => x.id === q.id);
      expect(q.level).toBe(1);
      expect(q.options[q.answer]).toBe(original.options[original.answer]);
    }
  });
});
