// Top bar (coins, level, farm health, weather, menu buttons, language picker)
// and the bottom toolbar (tools + seed picker). All text comes from t().

import { WEATHER, MAX_LEVEL } from '../config.js';
import { CROP_LIST } from '../data/crops.js';
import { levelProgress } from '../engine/progress.js';
import { isNight, sunlight } from '../engine/simulation.js';
import { t, LANGUAGES, getLanguage, getLanguageInfo } from '../translations/index.js';
import { $, $$, el, esc } from './dom.js';

export const TOOLS = [
  { id: 'hand', icon: '✋', key: '1' },
  { id: 'plant', icon: '🌱', key: '2' },
  { id: 'water', icon: '💧', key: '3' },
  { id: 'harvest', icon: '🧺', key: '4' },
  { id: 'compost', icon: '🟤', key: '5' },
  { id: 'spray', icon: '🧴', key: '6' },
  { id: 'inspect', icon: '🔍', key: '7' },
];
export const toolHint = (id) => t(`tools.${id}.hint`);

/** The language buttons, used in the top bar, the intro and settings. */
export function languageButtons(extraClass = '') {
  return LANGUAGES.map((l) => `
    <button class="lang-option ${extraClass} ${l.code === getLanguage() ? 'active' : ''}" data-lang="${l.code}"
      lang="${l.code}" dir="${l.dir}" aria-pressed="${l.code === getLanguage()}">${l.label}</button>`).join('');
}

export function buildHud(root) {
  const menuBtn = (open, icon, label, title) =>
    `<button class="menu-btn" data-open="${open}" title="${esc(title)}"><span>${icon}</span><em>${label}</em>${open === 'journal' ? '<i class="dot" data-hud="journalDot"></i>' : ''}</button>`;
  const hud = el(`
    <header class="hud">
      <div class="brand"><span class="logo">🌻</span><h1>${t('brand.line1')} <span>${t('brand.line2')}</span></h1></div>
      <div class="stats">
        <div class="chip coins" title="${esc(t('hud.coinsTitle'))}"><span class="ico">🪙</span><b class="num" data-hud="coins">0</b></div>
        <div class="chip level" title="${esc(t('hud.levelTitle'))}">
          <span class="lvl-badge num" data-hud="level">1</span>
          <div class="xp"><div class="bar xp-bar"><i data-hud="xp"></i></div><small data-hud="xpText"></small></div>
        </div>
        <div class="chip health" title="${esc(t('hud.healthTitle'))}">
          <span class="ico heart">💚</span>
          <div class="xp"><div class="bar health-bar"><i data-hud="health"></i></div><small data-hud="healthText"></small></div>
        </div>
        <div class="chip weather" title="${esc(t('hud.weatherTitle'))}">
          <span class="ico" data-hud="weatherIcon">☀️</span>
          <div class="xp"><b data-hud="weather"></b><small data-hud="sun"></small></div>
        </div>
      </div>
      <nav class="menu">
        ${menuBtn('journal', '📖', t('hud.journal'), t('hud.journalTitle'))}
        ${menuBtn('quiz', '🧠', t('hud.quiz'), t('hud.quizTitle'))}
        ${menuBtn('barn', '🏠', t('hud.barn'), t('hud.barnTitle'))}
        <button class="menu-btn" data-action="speed" title="${esc(t('hud.speedTitle'))}"><span data-hud="speed">▶️</span><em data-hud="speedText"></em></button>
        <div class="lang-picker">
          <button class="menu-btn lang-toggle" data-lang-toggle aria-haspopup="true" aria-expanded="false" title="${esc(t('lang.choose'))}">
            <span>🌐</span><em lang="${getLanguage()}">${getLanguageInfo().label}</em>
          </button>
          <div class="lang-menu" role="menu" aria-label="${esc(t('lang.label'))}">${languageButtons()}</div>
        </div>
        ${menuBtn('settings', '⚙️', t('hud.more'), t('hud.moreTitle'))}
      </nav>
    </header>`);
  root.appendChild(hud);
  return hud;
}

export function updateHud(state, game) {
  const set = (k, v) => { const n = $(`[data-hud="${k}"]`); if (n && n.textContent !== String(v)) n.textContent = v; };
  set('coins', state.coins);
  set('level', state.level);
  $('[data-hud="xp"]').style.width = `${levelProgress(state) * 100}%`;
  set('xpText', state.level >= MAX_LEVEL ? t('hud.maxLevel') : t('hud.levelProgress', { n: state.level, p: Math.round(levelProgress(state) * 100) }));
  $('[data-hud="health"]').style.width = `${state.farmHealth}%`;
  const hb = $('.health-bar');
  hb.dataset.tone = state.farmHealth >= 70 ? 'good' : state.farmHealth >= 45 ? 'ok' : 'bad';
  $('.heart').textContent = state.farmHealth >= 70 ? '💚' : state.farmHealth >= 45 ? '💛' : '❤️‍🩹';
  set('healthText', t('hud.health', { n: state.farmHealth }));

  const night = isNight(state);
  const w = t(`weather.${state.weather}`);
  set('weatherIcon', night ? '🌙' : WEATHER[state.weather].icon);
  set('weather', night ? t('hud.night', { w }) : w);
  set('sun', t('hud.sunlight', { n: Math.round(sunlight(state) * 100) }));

  set('speed', game.paused ? '⏸️' : state.settings.speed > 1 ? '⏩' : '▶️');
  set('speedText', game.paused ? t('hud.paused') : t('hud.speed', { n: state.settings.speed }));
  $('[data-hud="journalDot"]').classList.toggle('show', game.unseenDiscovery);
}

/** Open or close the language drop-down in the top bar. */
export function toggleLanguageMenu(force) {
  const picker = $('.lang-picker');
  if (!picker) return;
  const open = force ?? !picker.classList.contains('open');
  picker.classList.toggle('open', open);
  $('.lang-toggle', picker).setAttribute('aria-expanded', String(open));
}

// ── Toolbar ──────────────────────────────────────────────────
export function buildToolbar(root) {
  const bar = el(`
    <nav class="toolbar" aria-label="${esc(t('tools.aria'))}">
      <div class="seed-tray" aria-label="${esc(t('seeds.aria'))}"></div>
      <div class="tools">
        ${TOOLS.map((tool) => `
          <button class="tool" data-tool="${tool.id}" title="${esc(`${toolHint(tool.id)} (${t('tools.key', { k: tool.key })})`)}">
            <span class="t-ico">${tool.icon}</span><span class="t-label">${t(`tools.${tool.id}.label`)}</span><b class="t-badge num"></b>
          </button>`).join('')}
      </div>
    </nav>`);
  root.appendChild(bar);
  return bar;
}

export function updateToolbar(state, game) {
  $$('.tool').forEach((b) => b.classList.toggle('active', b.dataset.tool === game.tool));
  $('.tool[data-tool="compost"] .t-badge').textContent = state.inventory.compost || '';
  const seedCrop = CROP_LIST.find((c) => c.id === game.seed);
  $('.tool[data-tool="plant"] .t-ico').textContent = game.tool === 'plant' && seedCrop ? seedCrop.emoji : '🌱';

  const tray = $('.seed-tray');
  tray.classList.toggle('open', game.tool === 'plant' || game.tool === 'hand');
  const key = `${state.level}|${game.seed}|${state.coins}`;
  if (tray.dataset.key === key) return;
  tray.dataset.key = key;
  tray.innerHTML = `<span class="tray-title">${t('seeds.title')}</span>` + CROP_LIST.map((c) => {
    const locked = state.level < c.level;
    const poor = state.coins < c.seedCost;
    const title = locked
      ? t('seeds.locked', { n: c.level })
      : `${t('seeds.info', { name: c.name, n: c.seedCost })}${c.needsBees ? ` · ${t('seeds.needsBees')}` : ''}`;
    return `<button class="seed ${game.seed === c.id ? 'active' : ''} ${locked ? 'locked' : ''} ${poor ? 'poor' : ''}"
      data-seed="${c.id}" ${locked ? 'disabled' : ''} title="${esc(title)}">
      <span class="s-ico">${locked ? '🔒' : c.emoji}</span>
      <span class="s-name">${c.name}</span>
      <span class="s-cost num">${locked ? t('common.levelShort', { n: c.level }) : `🪙${c.seedCost}`}</span>
      ${c.needsBees && !locked ? `<i class="s-bee" title="${esc(t('seeds.needsBees'))}">🐝</i>` : ''}
    </button>`;
  }).join('');
}
