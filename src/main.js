// ─────────────────────────────────────────────────────────────
// Farm Ecosystem – entry point.
// Creates the game object, builds the UI, connects player input to
// engine actions, listens to engine events, and runs the game loop.
// ─────────────────────────────────────────────────────────────
import './styles/main.css';

import { TICK_MS, PLOTS_BY_LEVEL, WATER_AMOUNT } from './config.js';
import { CROPS } from './data/crops.js';
import { ANIMALS } from './data/shop.js';
import { loadState, saveState, clearSave, createState } from './engine/state.js';
import { tick, isRipe } from './engine/simulation.js';
import { addCoins, addXP, updateProgress, isPlotUnlocked } from './engine/progress.js';
import * as actions from './engine/actions.js';
import { on } from './engine/bus.js';
import { t, setLanguage, onLanguageChange, applyDocumentLanguage } from './translations/index.js';

import { $, el } from './ui/dom.js';
import { buildScene, updateScene, floatText, burst, resetSceneCache } from './ui/scene.js';
import { buildHud, updateHud, buildToolbar, updateToolbar, TOOLS, toolHint, toggleLanguageMenu } from './ui/hud.js';
import { buildSidebar, updateSidebar, say, nextMessage, clearSpeech } from './ui/sidebar.js';
import * as modals from './ui/modals.js';
import { play, setSoundEnabled } from './ui/sound.js';

// ── The game object: state + UI choices ─────────────────────
const game = {
  state: loadState(),
  tool: 'hand', // selected tool
  seed: 'carrot', // selected seed
  selected: null, // selected plot id (for the inspector)
  paused: false,
  unseenDiscovery: false,
  handle, // so UI modules can call actions
};
window.__game = game; // handy for debugging in the browser console

// ── Build the page ──────────────────────────────────────────
// Toasts and pop-ups live outside #app so a language switch can
// rebuild the game screen without closing them.
const app = $('#app');
const toastBox = el('<div class="toasts" aria-live="polite"></div>');
const modalRoot = el('<div class="modal-root"></div>');
document.body.append(toastBox, modalRoot);
modals.initModals(modalRoot);

function buildUI() {
  app.innerHTML = '';
  resetSceneCache();
  buildHud(app);
  const main = el('<main class="layout"><div class="scene-wrap"></div></main>');
  app.appendChild(main);
  buildScene($('.scene-wrap', main));
  buildSidebar(main);
  buildToolbar(app);
}

applyDocumentLanguage();
buildUI();
setSoundEnabled(game.state.settings.sound);

// ── Toast messages ──────────────────────────────────────────
function toast(text, kind = '') {
  const node = el(`<div class="toast ${kind}">${text}</div>`);
  toastBox.appendChild(node);
  while (toastBox.children.length > 3) toastBox.firstChild.remove();
  setTimeout(() => node.classList.add('out'), 3200);
  setTimeout(() => node.remove(), 3700);
}

/** Show the result of an action. */
function feedback(result, plotId = null) {
  if (!result) return;
  if (result.ok) {
    say(result.msg);
  } else {
    play('error');
    if (plotId !== null) floatText('🙅', plotId);
    toast(result.msg, 'warn');
  }
}

// ── Clicking a plot ─────────────────────────────────────────
function onPlotClick(id) {
  const s = game.state;
  game.selected = id;
  if (!isPlotUnlocked(s, id)) {
    feedback({ ok: false, msg: t('msg.fieldLockedLevel', { n: PLOTS_BY_LEVEL.findIndex((n) => n > id) }) }, id);
    return render();
  }
  const plot = s.plots[id];
  let tool = game.tool;

  // The helper hand picks the most useful action.
  if (tool === 'hand') {
    if (!plot.crop) tool = 'plant';
    else if (plot.dead || isRipe(plot)) tool = 'harvest';
    else if (plot.water < 60) tool = 'water';
    else tool = 'inspect';
  }

  let r = null;
  switch (tool) {
    case 'plant':
      if (plot.crop) { r = { ok: false, msg: t('msg.occupiedHarvest') }; break; }
      r = actions.plant(s, id, game.seed);
      if (r.ok) { play('plant'); burst(id, 'dirt'); floatText(t('msg.seedCost', { n: CROPS[game.seed].seedCost }), id); }
      break;
    case 'water':
      r = actions.water(s, id);
      if (r.ok) { play('water'); burst(id, 'water'); floatText(t('msg.waterAdded', { n: WATER_AMOUNT }), id); }
      break;
    case 'harvest':
      r = actions.harvest(s, id);
      if (r.ok) {
        play('harvest');
        burst(id, 'sparkle');
        floatText(r.crop ? t('msg.harvestFloat', { emoji: CROPS[r.crop].emoji }) : '♻️', id);
      }
      break;
    case 'compost':
      r = actions.applyCompost(s, id);
      if (r.ok) { play('pop'); burst(id, 'dirt'); floatText(t('msg.soilFood'), id); }
      break;
    case 'spray':
      r = actions.spray(s, id);
      if (r.ok) { play('buzz'); burst(id, 'spray'); }
      break;
    default:
      play('click');
  }
  feedback(r, id);
  render();
}

// ── Central action handler (used by buttons and modals) ─────
function handle(action, arg) {
  const s = game.state;
  let r = null;
  switch (action) {
    case 'barn': play('click'); modals.openBarn(game); break;
    case 'compost':
      r = actions.collectCompost(s);
      if (r.ok) { play('pop'); toast(r.msg); game.tool = 'compost'; }
      break;
    case 'pond':
      say(s.irrigation ? t('say.pondIrrigation') : t('say.pond'));
      play('water');
      break;
    case 'hive':
      say(t('say.hive', { n: Math.round(s.beeHealth) }));
      play('buzz');
      break;
    case 'hiveSlot': play('click'); modals.openBarn(game, 'shop'); break;
    case 'animal': {
      const idx = Number(arg);
      const a = s.animals[idx];
      if (!a) break;
      if (a.ready) { r = actions.collectProduct(s, idx); if (r.ok) { play('coin'); toast(r.msg); } }
      else { r = actions.feedAnimal(s, idx); if (r.ok) play('pop'); }
      break;
    }
    case 'buy':
      r = actions.buy(s, arg);
      if (r.ok) { play('coin'); toast(r.msg); }
      break;
    case 'sell':
      r = actions.sell(s, arg);
      if (r.ok) { play('coin'); toast(r.msg); }
      break;
    case 'feed': r = actions.feedAnimal(s, Number(arg)); if (r.ok) play('pop'); break;
    case 'collect': r = actions.collectProduct(s, Number(arg)); if (r.ok) play('coin'); break;
    case 'removeHive': r = actions.removeHive(s); if (r.ok) toast(r.msg); break;
    case 'speed':
      if (game.paused) game.paused = false;
      else s.settings.speed = s.settings.speed >= 3 ? 1 : s.settings.speed + 1;
      restartLoop();
      play('click');
      break;
    case 'setSpeed': s.settings.speed = Number(arg); restartLoop(); break;
    case 'toggleSound':
      s.settings.sound = !s.settings.sound;
      setSoundEnabled(s.settings.sound);
      play('click');
      break;
    case 'quizAnswer': {
      s.stats.quizAnswered += 1;
      if (!arg.correct) { play('wrong'); break; }
      play('success');
      s.stats.quizCorrect += 1;
      let coins = 3;
      if (!s.quizMastered.includes(arg.id)) { s.quizMastered.push(arg.id); coins += 5; }
      addCoins(s, coins);
      addXP(s, 5);
      updateProgress(s);
      render();
      return { coins };
    }
    case 'nextTip': nextMessage(); break;
    case 'reset':
      clearSave();
      game.state = createState();
      game.selected = null;
      resetSceneCache();
      modals.closeModal(true);
      save();
      showIntro();
      break;
    default: break;
  }
  if (r && !r.ok) feedback(r);
  else if (r && r.ok && ['feed', 'animal'].includes(action)) say(r.msg);
  render();
  return r;
}

// ── Language switching ──────────────────────────────────────
// Changing language rebuilds the screen in the new language. The game
// state is untouched, so nothing is lost and the farm keeps growing.
onLanguageChange(() => {
  const openName = modals.activeModalName();
  modals.closeModal(true);
  clearSpeech();
  buildUI();
  render();
  if (openName === 'intro') showIntro({ keepStep: true });
  else if (openName === 'settings') modals.openSettings(game);
  say(t('say.languageChanged'));
});

// ── Input wiring (event delegation) ─────────────────────────
document.addEventListener('click', (e) => {
  const lang = e.target.closest('[data-lang]');
  if (lang) {
    toggleLanguageMenu(false);
    play('click');
    setLanguage(lang.dataset.lang);
    return;
  }
  if (e.target.closest('[data-lang-toggle]')) { play('click'); return toggleLanguageMenu(); }
  toggleLanguageMenu(false); // any other click closes the language menu

  if (e.target.closest('.modal-root')) return; // pop-ups handle their own buttons

  const plot = e.target.closest('.plot');
  if (plot) return onPlotClick(Number(plot.dataset.plot));

  const tool = e.target.closest('[data-tool]');
  if (tool) {
    game.tool = tool.dataset.tool;
    play('click');
    const def = TOOLS.find((x) => x.id === game.tool);
    if (def) toast(`${def.icon} ${toolHint(def.id)}`);
    return render();
  }
  const seed = e.target.closest('[data-seed]');
  if (seed) {
    game.seed = seed.dataset.seed;
    if (game.tool !== 'hand') game.tool = 'plant';
    const c = CROPS[game.seed];
    play('click');
    say(t('say.seed', { emoji: c.emoji, name: c.name, fact: c.fact }) + (c.needsBees ? t('say.seedBees') : ''));
    return render();
  }
  const animal = e.target.closest('[data-animal]');
  if (animal) return handle('animal', animal.dataset.animal);

  const open = e.target.closest('[data-open]');
  if (open) {
    play('click');
    const name = open.dataset.open;
    if (name === 'journal') modals.openJournal(game);
    if (name === 'quiz') modals.openQuiz(game);
    if (name === 'barn') modals.openBarn(game);
    if (name === 'settings') modals.openSettings(game);
    return render();
  }
  const act = e.target.closest('[data-action]');
  if (act) handle(act.dataset.action, act.dataset.arg);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') toggleLanguageMenu(false);
  if (modals.isModalOpen() || e.target.matches('input, textarea')) return;
  const def = TOOLS.find((x) => x.key === e.key);
  if (def) { game.tool = def.id; render(); }
  if (e.code === 'Space' && !e.target.closest('button')) { e.preventDefault(); game.paused = !game.paused; render(); }
});

// ── Engine events → animations, sounds and explanations ─────
on('float', ({ plotId, text }) => floatText(text, plotId));
on('discovery', ({ discovery }) => {
  play('discover');
  game.unseenDiscovery = true;
  say(`<b>${discovery.title}</b><br>${discovery.text}`, { title: t('say.discoveryTitle'), priority: true, mood: 'excited' });
  toast(t('toast.discovery', { title: discovery.title }), 'discover');
});
on('missionComplete', ({ mission, next }) => {
  play('success');
  queueCelebration({
    title: t('celebrate.mission'),
    icon: mission.icon,
    text: `<b>${mission.title}</b>`,
    reward: `<span class="num">🪙 +${mission.reward.coins}</span><span class="num">⭐ +${mission.reward.xp}</span>`,
    lesson: mission.lesson,
    onClose: () => next && say(t('say.nextMission', { icon: next.icon, title: next.title, desc: next.desc })),
  });
});
on('levelUp', ({ level, newCrops, plots }) => {
  play('success');
  const newFields = plots - PLOTS_BY_LEVEL[level - 1];
  const unlocks = [
    ...newCrops.map((c) => `${c.emoji} ${c.name}`),
    newFields > 0 ? t('celebrate.newFields', { count: newFields }) : '',
    level === 2 ? t('celebrate.irrigation') : '', level === 3 ? t('celebrate.cowsHeat') : '',
  ].filter(Boolean);
  queueCelebration({
    title: t('celebrate.level', { n: level }),
    icon: '🏅',
    text: t('celebrate.levelText'),
    reward: (unlocks.length ? unlocks : [t('celebrate.keepGoing')]).map((u) => `<span>${u}</span>`).join(''),
  });
});
on('achievement', ({ achievement }) => {
  play('discover');
  toast(t('toast.badge', { icon: achievement.icon, title: achievement.title }), 'badge');
});
on('plantDied', ({ plotId, crop }) => {
  floatText('💀', plotId);
  say(t('say.plantDied', { crop: CROPS[crop].name }), { mood: 'sad' });
});
on('weather', ({ weather }) => {
  if (weather === 'rainy') say(t('say.rain'));
  if (weather === 'heatwave') say(t('say.heatwave'), { mood: 'worried' });
});
on('night', () => say(t('say.night')));
on('pollinated', ({ plotId }) => { play('pop'); burst(plotId, 'pollen'); });
on('compostReady', () => {
  const bin = $('.compost-bin');
  bin?.classList.remove('bump'); void bin?.offsetWidth; bin?.classList.add('bump');
});
on('animalReady', ({ index }) => {
  const a = game.state.animals[index];
  if (a) floatText(ANIMALS[a.type].productEmoji, null, { x: 12, y: 50 });
});

// Celebrations wait until the current pop-up closes.
const celebrationQueue = [];
function queueCelebration(opts) {
  celebrationQueue.push(opts);
  if (!modals.isModalOpen()) showNextCelebration();
}
function showNextCelebration() {
  const next = celebrationQueue.shift();
  if (!next) return;
  const after = next.onClose;
  modals.openCelebration({ ...next, onClose: () => { after?.(); setTimeout(showNextCelebration, 250); } });
}

// ── Rendering & loop ────────────────────────────────────────
function render() {
  updateScene(game.state, game);
  updateHud(game.state, game);
  updateToolbar(game.state, game);
  updateSidebar(game.state, game);
}

let loop = null;
function step() {
  // Pop-ups pause the farm so kids can read without stress.
  if (game.paused || modals.isModalOpen()) return render();
  tick(game.state);
  render();
  if (!modals.isModalOpen() && celebrationQueue.length) showNextCelebration();
}
function restartLoop() {
  clearInterval(loop);
  loop = setInterval(step, TICK_MS / game.state.settings.speed);
}

function save() { saveState(game.state); }
setInterval(save, 5000);
window.addEventListener('beforeunload', save);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) save();
});

function showIntro(opts) {
  modals.openIntro(game, () => {
    game.state.seenIntro = true;
    save();
    say(t('say.start'));
  }, opts);
}

// ── Start! ──────────────────────────────────────────────────
updateProgress(game.state);
render();
restartLoop();
if (!game.state.seenIntro) showIntro();
else say(t('say.welcomeBack', { n: game.state.farmHealth }));
