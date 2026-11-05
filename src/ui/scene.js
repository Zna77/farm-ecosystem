// The farm scene: sky, sun, weather, barn, pond, hives, animals,
// compost bin and the field of plots. `buildScene` creates the DOM
// once; `updateScene` refreshes it after every tick or action.

import { PLOT_COUNT, PLOTS_BY_LEVEL, NIGHT_START, MAX_HIVES } from '../config.js';
import { CROPS } from '../data/crops.js';
import { ANIMALS } from '../data/shop.js';
import { dayTime, isNight, stageOf, isRipe, waitingForBees } from '../engine/simulation.js';
import { t } from '../translations/index.js';
import { $, $$, el, esc } from './dom.js';
import * as art from './art.js';

let scene;
const plotKeys = new Map(); // cache: only redraw a plot when it changes
let lastBeeMove = 0;

export function buildScene(root) {
  scene = el(`
    <div class="scene" id="scene">
      <div class="sky"></div>
      <div class="sun" aria-hidden="true"><div class="sun-rays"></div></div>
      <div class="moon" aria-hidden="true">🌙</div>
      <div class="stars" aria-hidden="true">✦ ✧ ✦ ✧ ✦</div>
      <div class="cloud c1">${art.cloudSVG()}</div>
      <div class="cloud c2">${art.cloudSVG()}</div>
      <div class="cloud c3">${art.cloudSVG()}</div>
      ${art.backgroundSVG()}
      <div class="obj tree t1">${art.treeSVG()}</div>
      <div class="obj tree t2">${art.treeSVG('#ffb300')}</div>
      <button class="obj barn" data-action="barn" aria-label="${esc(t('scene.barn'))}">${art.barnSVG()}<span class="label">${t('scene.barn')}</span><span class="barn-count"></span></button>
      <div class="obj pen" aria-label="${esc(t('scene.pen'))}">
        <div class="pen-fence">${art.fenceSVG()}</div>
        <div class="pen-animals"></div>
        <span class="label pen-empty">${t('scene.pen')}</span>
      </div>
      <button class="obj compost-bin" data-action="compost" aria-label="${esc(t('scene.compost'))}"><div class="bin-art"></div><span class="label">${t('scene.compost')}</span><span class="bin-ready"></span></button>
      <button class="obj pond" data-action="pond" aria-label="${esc(t('scene.pond'))}">${art.pondSVG()}<span class="label">${t('scene.pond')}</span></button>
      <div class="obj hives"></div>
      <div class="obj scarecrow">${art.scarecrowSVG()}</div>
      <div class="pipe" aria-hidden="true"></div>
      <div class="field" aria-label="${esc(t('scene.fields'))}">
        ${Array.from({ length: PLOT_COUNT }, (_, i) => `<button class="plot" data-plot="${i}" aria-label="${esc(t('scene.field', { n: i + 1 }))}"></button>`).join('')}
      </div>
      <div class="bees" aria-hidden="true"></div>
      <div class="butterflies" aria-hidden="true"><span class="bfly b1">🦋</span><span class="bfly b2">🦋</span></div>
      <div class="rain" aria-hidden="true"></div>
      <div class="night-shade" aria-hidden="true"></div>
      <div class="floats" aria-hidden="true"></div>
    </div>`);
  root.appendChild(scene);

  // Rain drops
  const rain = $('.rain', scene);
  for (let i = 0; i < 60; i++) {
    const d = document.createElement('i');
    d.style.left = `${Math.random() * 100}%`;
    d.style.animationDelay = `${Math.random() * 1}s`;
    d.style.animationDuration = `${0.6 + Math.random() * 0.4}s`;
    rain.appendChild(d);
  }
  return scene;
}

// ── Sky, sun and weather ─────────────────────────────────────
function updateSky(state) {
  const t = dayTime(state);
  const night = isNight(state);
  scene.dataset.weather = state.weather;
  scene.classList.toggle('is-night', night);

  // Sun travels in an arc during the day.
  const dayT = Math.min(1, t / NIGHT_START);
  const sun = $('.sun', scene);
  sun.style.left = `${6 + dayT * 82}%`;
  sun.style.top = `${22 - Math.sin(dayT * Math.PI) * 18}%`;

  // Darkness: dusk near the end of the day, dark at night, dawn at the start.
  let dark = 0;
  if (night) dark = 0.55;
  else if (t > NIGHT_START - 0.06) dark = ((t - (NIGHT_START - 0.06)) / 0.06) * 0.4;
  else if (t < 0.04) dark = (1 - t / 0.04) * 0.4;
  $('.night-shade', scene).style.opacity = dark.toFixed(2);
}

// ── Plots ────────────────────────────────────────────────────
function plotStatus(plot) {
  if (!plot.crop) return [];
  if (plot.dead) return ['💀'];
  const s = [];
  if (isRipe(plot)) s.push('✨');
  if (plot.wilted) s.push('🥵');
  else if (plot.water < 35) s.push('💧');
  if (waitingForBees(plot)) s.push('🌸');
  if (plot.aphids >= 25) s.push('🐛');
  if (plot.fertility < 30) s.push('🟫');
  return s;
}

function renderPlot(btn, plot, state, game) {
  const unlocked = plot.id < PLOTS_BY_LEVEL[state.level];
  const stage = stageOf(plot);
  const status = plotStatus(plot);
  const aphidDots = plot.aphids > 0 ? Math.ceil(plot.aphids / 20) : 0;
  const key = [unlocked, plot.crop, stage, plot.wilted, plot.dead, status.join(''), aphidDots, state.ladybugs > 0].join('|');

  // Always update the cheap things (bars + soil colour)
  btn.style.setProperty('--fert', plot.fertility.toFixed(0));
  btn.style.setProperty('--wet', (plot.water / 100).toFixed(2));
  btn.classList.toggle('selected', game.selected === plot.id);
  btn.classList.toggle('locked', !unlocked);
  btn.classList.toggle('ripe', isRipe(plot));
  const growthBar = btn.querySelector('.pbar i');
  if (growthBar) growthBar.style.width = `${plot.growth.toFixed(0)}%`;

  if (plotKeys.get(plot.id) === key) return;
  const prev = plotKeys.get(plot.id);
  plotKeys.set(plot.id, key);

  if (!unlocked) {
    const lvl = PLOTS_BY_LEVEL.findIndex((n) => n > plot.id);
    btn.innerHTML = `<div class="soil"></div><div class="lock">🔒<small>${t('common.level', { n: lvl })}</small></div>`;
    btn.setAttribute('aria-label', t('scene.lockedField', { n: lvl }));
    return;
  }

  const crop = plot.crop ? CROPS[plot.crop] : null;
  const plant = crop
    ? `<div class="plant ${plot.wilted ? 'wilted' : ''} ${plot.dead ? 'dead' : ''} ${prev && prev.split('|')[2] !== String(stage) ? 'grow-pop' : ''}">${art.plantSVG(crop, stage)}</div>`
    : `<div class="empty-hint">＋</div>`;
  const aphids = aphidDots
    ? `<div class="aphids">${'<i></i>'.repeat(aphidDots)}${state.ladybugs > 0 ? '<b class="hunter">🐞</b>' : ''}</div>`
    : '';
  const growth = crop && !plot.dead ? `<div class="pbar"><i style="width:${plot.growth.toFixed(0)}%"></i></div>` : '';

  btn.innerHTML = `<div class="soil"><span class="rows"></span></div>${plant}${aphids}
    <div class="badges">${status.map((s) => `<span>${s}</span>`).join('')}</div>${growth}`;
  btn.setAttribute('aria-label', crop
    ? t('scene.plotCrop', { crop: crop.name, stage: plot.dead ? t('scene.dead') : t('stages')[stage] })
    : t('scene.emptyField'));
}

// ── Hives, animals, compost ─────────────────────────────────
function updateHives(state) {
  const box = $('.hives', scene);
  const key = `${state.hives}`;
  if (box.dataset.key === key) return;
  box.dataset.key = key;
  let html = '';
  for (let i = 0; i < MAX_HIVES; i++) {
    html += i < state.hives
      ? `<button class="hive" data-action="hive" aria-label="${esc(t('scene.hive'))}">${art.hiveSVG()}</button>`
      : `<button class="hive-slot" data-action="hiveSlot" aria-label="${esc(t('scene.hiveSlot'))}">＋🐝</button>`;
  }
  box.innerHTML = html;
}

function updateAnimals(state) {
  const box = $('.pen-animals', scene);
  $('.pen-empty', scene).style.display = state.animals.length ? 'none' : '';
  const key = state.animals.map((a) => `${a.type}${a.ready ? 'R' : ''}${a.hunger > 60 ? 'H' : ''}`).join(',');
  if (box.dataset.key === key) return;
  box.dataset.key = key;
  box.innerHTML = state.animals.map((a, i) => {
    const def = ANIMALS[a.type];
    const bubble = a.ready ? `<span class="bubble">${def.productEmoji}</span>` : a.hunger > 60 ? '<span class="bubble hungry">🍽️</span>' : '';
    return `<button class="animal ${a.type}" data-animal="${i}" style="--i:${i}" aria-label="${esc(def.name)}">${bubble}<span class="body">${def.emoji}</span></button>`;
  }).join('');
}

function updateCompost(state) {
  const bin = state.compost;
  const fill = Math.min(1, (bin.organic + bin.ready) / 12);
  const key = `${fill.toFixed(1)}`;
  const art2 = $('.bin-art', scene);
  if (art2.dataset.key !== key) {
    art2.dataset.key = key;
    art2.innerHTML = art.compostSVG(fill);
  }
  const ready = $('.bin-ready', scene);
  ready.textContent = bin.ready > 0 ? `${bin.ready} 🟤` : '';
  ready.classList.toggle('show', bin.ready > 0);

  const barnCount = Object.values(state.barn).reduce((a, b) => a + b, 0);
  const bc = $('.barn-count', scene);
  bc.textContent = barnCount ? `🧺 ${barnCount}` : '';
  bc.classList.toggle('show', barnCount > 0);
}

// ── Bees fly between flowers ────────────────────────────────
function plotCenter(id) {
  const p = $(`.plot[data-plot="${id}"]`, scene);
  if (!p) return null;
  const s = scene.getBoundingClientRect();
  const r = p.getBoundingClientRect();
  return { x: ((r.left + r.width / 2 - s.left) / s.width) * 100, y: ((r.top + r.height * 0.35 - s.top) / s.height) * 100 };
}

function hiveCenter(i) {
  const h = $$('.hive', scene)[i % Math.max(1, $$('.hive', scene).length)];
  if (!h) return { x: 80, y: 30 };
  const s = scene.getBoundingClientRect();
  const r = h.getBoundingClientRect();
  return { x: ((r.left + r.width / 2 - s.left) / s.width) * 100, y: ((r.top + r.height / 2 - s.top) / s.height) * 100 };
}

function updateBees(state) {
  const box = $('.bees', scene);
  const want = state.hives * 3;
  while (box.children.length < want) box.appendChild(el('<span class="bee">🐝</span>'));
  while (box.children.length > want) box.lastChild.remove();

  const home = state.weather === 'rainy' || isNight(state);
  box.classList.toggle('home', home);
  const now = performance.now();
  if (now - lastBeeMove < 2200) return;
  lastBeeMove = now;

  const flowers = state.plots.filter((p) => p.crop && !p.dead && stageOf(p) >= 3).map((p) => p.id);
  [...box.children].forEach((bee, i) => {
    let target;
    if (!home && flowers.length && Math.random() < 0.75) {
      target = plotCenter(flowers[Math.floor(Math.random() * flowers.length)]);
    } else {
      const h = hiveCenter(Math.floor(i / 3));
      target = { x: h.x + (Math.random() - 0.5) * 8, y: h.y + (Math.random() - 0.5) * 8 };
    }
    if (target) {
      bee.style.left = `${target.x + (Math.random() - 0.5) * 4}%`;
      bee.style.top = `${target.y + (Math.random() - 0.5) * 4}%`;
    }
  });
}

// ── Floating "+1" text ──────────────────────────────────────
export function floatText(text, plotId = null, at = null) {
  if (!scene) return;
  let pos = at;
  if (plotId !== null && plotId !== undefined) pos = plotCenter(plotId);
  if (!pos) pos = { x: 50, y: 40 };
  const f = el(`<span class="float">${text}</span>`);
  f.style.left = `${pos.x}%`;
  f.style.top = `${pos.y}%`;
  $('.floats', scene).appendChild(f);
  setTimeout(() => f.remove(), 1600);
}

/** Small burst animation on a plot (water splash, compost, etc.) */
export function burst(plotId, kind) {
  const p = $(`.plot[data-plot="${plotId}"]`, scene);
  if (!p) return;
  const fx = el(`<span class="fx fx-${kind}"></span>`);
  p.appendChild(fx);
  setTimeout(() => fx.remove(), 900);
}

export function updateScene(state, game) {
  if (!scene) return;
  updateSky(state);
  $$('.plot', scene).forEach((btn, i) => renderPlot(btn, state.plots[i], state, game));
  updateHives(state);
  updateAnimals(state);
  updateCompost(state);
  updateBees(state);
  scene.classList.toggle('has-irrigation', state.irrigation);
  scene.dataset.activeTool = game.tool;
}

export function resetSceneCache() {
  plotKeys.clear();
  if (!scene) return;
  $$('[data-key]', scene).forEach((n) => delete n.dataset.key);
}
