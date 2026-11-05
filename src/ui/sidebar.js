// Side panel: Professor Hoot (the guide), the current mission,
// the field inspector and a mini ecosystem overview.

import { CROPS } from '../data/crops.js';
import { MISSIONS } from '../data/missions.js';
import { THIRSTY_WATER } from '../config.js';
import { currentMission, missionProgress, isPlotUnlocked, computeHealth } from '../engine/progress.js';
import { stageOf, isRipe, waitingForBees, growthFactors } from '../engine/simulation.js';
import { t } from '../translations/index.js';
import { $, el, esc, bar } from './dom.js';
import { owlSVG } from './art.js';

export function buildSidebar(root) {
  const side = el(`
    <aside class="side">
      <section class="card mascot" aria-live="polite">
        <div class="owl-wrap">${owlSVG()}</div>
        <div class="speech"><b class="speech-title">${t('common.professor')}</b><p class="speech-text"></p>
        <button class="speech-next" data-action="nextTip" aria-label="${esc(t('common.nextMessage'))}">▸</button></div>
      </section>
      <section class="card mission"></section>
      <section class="card inspector"></section>
      <section class="card eco"></section>
    </aside>`);
  root.appendChild(side);
  return side;
}

// ── Mascot speech queue ─────────────────────────────────────
const queue = [];
let current = null;
let timer = null;

/** Make Professor Hoot say something (text is already translated). */
export function say(text, { title = null, priority = false, mood = '' } = {}) {
  const msg = { text, title, mood };
  if (priority) queue.unshift(msg); else queue.push(msg);
  if (queue.length > 6) queue.splice(6);
  if (!current || priority) nextMessage();
}

export function clearSpeech() {
  queue.length = 0;
  current = null;
  clearTimeout(timer);
}

export function nextMessage() {
  clearTimeout(timer);
  current = queue.shift() || null;
  const box = $('.mascot');
  if (!box) return;
  if (!current) { box.classList.remove('talking'); return; }
  box.classList.add('talking');
  box.dataset.mood = current.mood;
  $('.speech-title', box).textContent = current.title || t('common.professor');
  $('.speech-text', box).innerHTML = current.text; // our own trusted translation text
  box.classList.remove('pop'); void box.offsetWidth; box.classList.add('pop');
  $('.speech-next', box).style.visibility = queue.length ? 'visible' : 'hidden';
  timer = setTimeout(() => (queue.length ? nextMessage() : null), Math.max(5000, current.text.length * 70));
}

// ── Mission card ────────────────────────────────────────────
function renderMission(state) {
  const box = $('.mission');
  const m = currentMission(state);
  const key = m ? `${m.id}|${missionProgress(state)}` : 'done';
  if (box.dataset.key === key) return;
  box.dataset.key = key;
  if (!m) {
    box.innerHTML = `<h3>${t('mission.allDoneTitle')}</h3><p>${t('mission.allDoneText')}</p>`;
    return;
  }
  const p = missionProgress(state);
  box.innerHTML = `
    <div class="card-head"><h3>${t('mission.header', { i: state.missionIndex + 1, n: MISSIONS.length })}</h3><span class="reward num">🪙${m.reward.coins} · ⭐${m.reward.xp}</span></div>
    <div class="mission-body"><span class="m-icon">${m.icon}</span><div><b>${esc(m.title)}</b><p>${esc(m.desc)}</p></div></div>
    ${bar((p / m.goal) * 100, 'mission-bar')}<small class="m-count num">${p} / ${m.goal}</small>`;
}

// ── Inspector ───────────────────────────────────────────────
function explainPlot(state, plot) {
  const lines = [];
  const add = (icon, key) => lines.push([icon, t(`inspector.${key}`)]);
  if (!plot.crop) {
    add('🌱', 'empty');
  } else if (plot.dead) {
    add('💀', 'deadText');
  } else {
    const f = growthFactors(state, plot);
    if (isRipe(plot)) add('✨', 'ripe');
    if (plot.wilted) add('🥵', 'wilting');
    else if (plot.water < THIRSTY_WATER) add('💧', 'thirsty');
    if (waitingForBees(plot)) add('🌸', state.hives ? 'waitingBees' : 'noBees');
    if (f.sun < 0.3) add('🌙', 'night');
    else if (f.sun < 0.8) add('⛅', 'lowSun');
    if (plot.fertility < 45) add('🟫', 'poorSoil');
    else if (plot.fertility > 80) add('🟤', 'richSoil');
    if (plot.aphids > 0) add('🐛', state.ladybugs ? 'aphidsHunted' : 'aphidsFree');
    if (!lines.length) add('😊', 'happy');
  }
  return lines;
}

function renderInspector(state, game) {
  const box = $('.inspector');
  const id = game.selected;
  if (id === null || id === undefined || !isPlotUnlocked(state, id)) {
    if (box.dataset.key === 'none') return;
    box.dataset.key = 'none';
    box.innerHTML = `<h3>${t('inspector.title')}</h3><p class="muted">${t('inspector.hint')}</p>`;
    return;
  }
  const plot = state.plots[id];
  const crop = plot.crop ? CROPS[plot.crop] : null;
  const lines = explainPlot(state, plot);
  const key = [id, plot.crop, Math.round(plot.growth), Math.round(plot.water), Math.round(plot.fertility), Math.round(plot.aphids), lines.map((l) => l[0]).join('')].join('|');
  if (box.dataset.key === key) return;
  box.dataset.key = key;
  const stage = stageOf(plot);
  const tag = crop ? (plot.dead ? t('inspector.dead') : t('stages')[stage]) : t('scene.field', { n: id + 1 });
  box.innerHTML = `
    <div class="card-head"><h3>${crop ? `${crop.emoji} ${esc(crop.name)}` : t('inspector.emptyTitle')}</h3><span class="tag">${esc(tag)}</span></div>
    <div class="meters">
      ${crop && !plot.dead ? `<label>${t('inspector.growth')}</label>${bar(plot.growth, 'growth')}` : ''}
      <label>${t('inspector.water')}</label>${bar(plot.water, plot.water < THIRSTY_WATER ? 'water low' : 'water')}
      <label>${t('inspector.soil')}</label>${bar(plot.fertility, plot.fertility < 45 ? 'soil low' : 'soil')}
      ${crop ? `<label>${t('inspector.aphids')}</label>${bar(plot.aphids, 'pests')}` : ''}
    </div>
    <ul class="why">${lines.map(([i, text]) => `<li><span>${i}</span>${esc(text)}</li>`).join('')}</ul>
    ${crop ? `<p class="fact">💡 ${esc(crop.fact)}</p>` : ''}`;
}

// ── Ecosystem overview ──────────────────────────────────────
function renderEco(state) {
  const box = $('.eco');
  const barnCount = Object.values(state.barn).reduce((a, b) => a + b, 0);
  const h = computeHealth(state);
  const key = [state.hives, Math.round(state.beeHealth), state.ladybugs, state.compost.organic, state.compost.ready,
    state.inventory.compost, barnCount, state.animals.length, state.irrigation, h.soil, h.water, h.pests, h.life].join('|');
  if (box.dataset.key === key) return;
  box.dataset.key = key;
  const cell = (icon, n, label, title) => `<div title="${esc(title)}"><span>${icon}</span><b class="num">${n}</b><small>${label}</small></div>`;
  box.innerHTML = `
    <h3>${t('eco.title')}</h3>
    <div class="eco-grid">
      ${cell('🐝', state.hives, t('eco.hives', { n: Math.round(state.beeHealth) }), t('eco.hivesTitle'))}
      ${cell('🐞', state.ladybugs, t('eco.ladybugs'), t('eco.ladybugsTitle'))}
      ${cell('🪱', state.compost.organic, t('eco.scraps'), t('eco.scrapsTitle'))}
      ${cell('🟤', state.inventory.compost, state.compost.ready ? t('eco.bagsInBin', { n: state.compost.ready }) : t('eco.bags'), t('eco.bagsTitle'))}
      ${cell('🧺', barnCount, t('eco.barn'), t('eco.barnTitle'))}
      ${cell('🐔', state.animals.length, state.irrigation ? t('eco.animalsIrrigation') : t('eco.animals'), t('eco.animalsTitle'))}
    </div>
    <h4 class="balance-title">${t('eco.balance')}</h4>
    <div class="balance">
      <label>${t('eco.soil')}</label>${bar(h.soil, 'soil')}
      <label>${t('eco.water')}</label>${bar(h.water, 'water')}
      <label>${t('eco.pests')}</label>${bar(h.pests, 'growth')}
      <label>${t('eco.biodiversity')}</label>${bar(h.life, 'life')}
    </div>`;
}

export function updateSidebar(state, game) {
  renderMission(state);
  renderInspector(state, game);
  renderEco(state);
}
