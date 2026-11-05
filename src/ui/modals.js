// Pop-up windows: Journal (missions, ecosystem web, badges), Quiz,
// Barn & Shop, Settings, and celebration screens. All text comes from t().

import { CROP_LIST } from '../data/crops.js';
import { SHOP, ANIMALS } from '../data/shop.js';
import { MISSIONS } from '../data/missions.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { DISCOVERIES, WEB_NODES, DISCOVERY_MAP } from '../data/discoveries.js';
import { QUIZZES } from '../data/quizzes.js';
import { missionProgress } from '../engine/progress.js';
import { t } from '../translations/index.js';
import { $, $$, el, esc, bar } from './dom.js';
import { owlSVG } from './art.js';
import { languageButtons } from './hud.js';

let root;
let active = null; // { name, el, render, onClose }
let keyListener = false;

export function initModals(container) {
  root = container;
  if (keyListener) return;
  keyListener = true;
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && active?.dismissable) closeModal();
  });
}

export const isModalOpen = () => !!active;

export function openModal({ name, title, className = '', render, onClose, dismissable = true }) {
  closeModal(true);
  const node = el(`
    <div class="modal-backdrop">
      <div class="modal ${className}" role="dialog" aria-modal="true" aria-label="${esc(title.replace(/<[^>]+>/g, ''))}">
        <header class="modal-head"><h2>${title}</h2>${dismissable ? `<button class="close" data-close aria-label="${esc(t('common.close'))}">✕</button>` : ''}</header>
        <div class="modal-body"></div>
      </div>
    </div>`);
  root.appendChild(node);
  document.body.classList.add('modal-open');
  active = { name, el: node, render, onClose, dismissable };
  node.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]') || (dismissable && e.target === node)) closeModal();
  });
  refreshModal();
  requestAnimationFrame(() => node.classList.add('show'));
  return node;
}

export function refreshModal() {
  if (!active || !active.render) return;
  const body = $('.modal-body', active.el);
  const scroll = body.scrollTop;
  active.render(body);
  body.scrollTop = scroll;
}

export function closeModal(silent = false) {
  if (!active) return;
  const { el: node, onClose } = active;
  active = null;
  document.body.classList.remove('modal-open');
  node.classList.remove('show');
  node.style.pointerEvents = 'none';
  setTimeout(() => node.remove(), 200);
  if (!silent && onClose) onClose();
}

export const activeModalName = () => active?.name;

// ── Journal ─────────────────────────────────────────────────
export function openJournal(game, tab = 'missions') {
  let current = tab;
  let selectedLink = null;
  openModal({
    name: 'journal',
    title: t('journal.title'),
    className: 'journal',
    render(body) {
      const s = game.state;
      const tabs = [['missions', 'tabMissions'], ['web', 'tabWeb'], ['book', 'tabBook'], ['badges', 'tabBadges']];
      body.innerHTML = `
        <div class="tabs">${tabs.map(([id, key]) => `<button class="tab ${current === id ? 'active' : ''}" data-tab="${id}">${t(`journal.${key}`)}</button>`).join('')}</div>
        <div class="tab-body">${
          current === 'missions' ? missionsTab(s)
            : current === 'web' ? webTab(s, selectedLink)
              : current === 'book' ? bookTab(s)
                : badgesTab(s)}</div>`;
      $$('[data-tab]', body).forEach((b) => b.addEventListener('click', () => { current = b.dataset.tab; refreshModal(); }));
      $$('[data-link]', body).forEach((b) => b.addEventListener('click', () => { selectedLink = b.dataset.link || selectedLink; refreshModal(); }));
    },
  });
  game.unseenDiscovery = false;
}

function missionsTab(s) {
  return `<ol class="mission-list">${MISSIONS.map((m, i) => {
    const done = i < s.missionIndex;
    const now = i === s.missionIndex;
    const p = now ? missionProgress(s, m) : 0;
    return `<li class="${done ? 'done' : now ? 'now' : 'later'}">
      <span class="m-icon">${done ? '✅' : now ? m.icon : '🔒'}</span>
      <div><b>${esc(m.title)}</b><p>${now || done ? esc(m.desc) : t('journal.lockedMission')}</p>
      ${now ? bar((p / m.goal) * 100, 'mission-bar') + `<small class="num">${p} / ${m.goal}</small>` : ''}
      ${done ? `<p class="lesson">💡 ${esc(m.lesson)}</p>` : ''}</div>
      <span class="reward num">🪙${m.reward.coins}</span></li>`;
  }).join('')}</ol>`;
}

function webTab(s, selected) {
  const found = new Set(s.discoveries);
  const used = new Set();
  const lines = DISCOVERIES.filter((d) => d.from !== d.to).map((d) => {
    const a = WEB_NODES[d.from];
    const b = WEB_NODES[d.to];
    const pairKey = [d.from, d.to].sort().join('-');
    const offset = used.has(pairKey) ? 2.5 : 0;
    used.add(pairKey);
    const on = found.has(d.id);
    // Shorten each line so the arrow tip stops at the edge of the node bubble.
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const cut = 7 / (Math.hypot(dx, dy) || 1);
    return `<line class="link ${on ? 'on' : ''} ${selected === d.id ? 'sel' : ''}" data-link="${on ? d.id : ''}"
      x1="${a.x + dx * cut + offset}" y1="${a.y + dy * cut + offset}" x2="${b.x - dx * cut + offset}" y2="${b.y - dy * cut + offset}" ${on ? 'marker-end="url(#arrow)"' : ''}/>`;
  }).join('');
  const sel = selected ? DISCOVERY_MAP[selected] : null;
  return `
    <p class="muted">${t('journal.webIntro', { n: s.discoveries.length, total: DISCOVERIES.length })}</p>
    <div class="web-wrap">
      <svg class="web" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" fill="#43a047"/></marker></defs>
        ${lines}
      </svg>
      ${Object.values(WEB_NODES).map((n) => `<div class="node" style="left:${n.x}%;top:${n.y}%"><span>${n.emoji}</span><small>${esc(n.label)}</small></div>`).join('')}
    </div>
    <div class="web-info">${sel ? `<b>${esc(sel.title)}</b><p>${esc(sel.text)}</p>` : `<p class="muted">${t('journal.tapArrow')}</p>`}</div>`;
}

function bookTab(s) {
  return `<div class="cards">${DISCOVERIES.map((d) => {
    const on = s.discoveries.includes(d.id);
    return `<article class="disc ${on ? '' : 'locked'}">
      <div class="disc-icons">${WEB_NODES[d.from].emoji}<span>➜</span>${WEB_NODES[d.to].emoji}</div>
      <b>${on ? esc(d.title) : t('journal.unknown')}</b>
      <p>${on ? esc(d.text) : t('journal.unknownText')}</p></article>`;
  }).join('')}</div>`;
}

function badgesTab(s) {
  return `<div class="badges-grid">${ACHIEVEMENTS.map((a) => {
    const on = s.achievements.includes(a.id);
    return `<div class="badge ${on ? 'on' : ''}"><span>${on ? a.icon : '🔒'}</span><b>${esc(a.title)}</b><small>${esc(a.desc)}</small></div>`;
  }).join('')}</div>`;
}

// ── Barn & Shop ─────────────────────────────────────────────
export function openBarn(game, tab = 'storage') {
  let current = tab;
  openModal({
    name: 'barn',
    title: t('barn.title'),
    className: 'barn-modal',
    render(body) {
      const s = game.state;
      const tabs = [['storage', 'tabStorage'], ['shop', 'tabShop'], ['animals', 'tabAnimals']];
      body.innerHTML = `
        <div class="tabs">${tabs.map(([id, key]) => `<button class="tab ${current === id ? 'active' : ''}" data-tab="${id}">${t(`barn.${key}`)}</button>`).join('')}</div>
        <div class="coins-line">${t('barn.youHave', { n: s.coins })}</div>
        <div class="tab-body">${current === 'storage' ? storageTab(s) : current === 'shop' ? shopTab(s) : animalsTab(s)}</div>`;
      $$('[data-tab]', body).forEach((b) => b.addEventListener('click', () => { current = b.dataset.tab; refreshModal(); }));
      $$('[data-do]', body).forEach((b) => b.addEventListener('click', () => {
        game.handle(b.dataset.do, b.dataset.arg);
        refreshModal();
      }));
    },
  });
}

function storageTab(s) {
  const items = CROP_LIST.filter((c) => (s.barn[c.id] || 0) > 0);
  if (!items.length) return `<div class="empty-state">🧺<p>${t('barn.emptyTitle')}</p><p class="muted">${t('barn.emptyText')}</p></div>`;
  const total = items.reduce((sum, c) => sum + s.barn[c.id] * c.sellPrice, 0);
  return `<div class="store-list">${items.map((c) => `
      <div class="store-item"><span class="big">${c.emoji}</span><div><b>${esc(t('barn.itemCount', { name: c.name, n: s.barn[c.id] }))}</b><small>${t('barn.each', { n: c.sellPrice })}</small></div>
      <button class="btn" data-do="sell" data-arg="${c.id}">${t('barn.sell')}</button></div>`).join('')}</div>
    <button class="btn primary wide" data-do="sell" data-arg="all">${t('barn.sellAll', { n: total })}</button>
    <p class="muted center">${t('barn.tip')}</p>`;
}

function shopTab(s) {
  return `<div class="shop-grid">${SHOP.map((item) => {
    const locked = s.level < item.level;
    const owned = (item.id === 'irrigation' && s.irrigation) || (item.id === 'hive' && s.hives >= 3) ||
      (ANIMALS[item.id] && s.animals.filter((a) => a.type === item.id).length >= ANIMALS[item.id].max);
    const poor = s.coins < item.price;
    return `<article class="shop-item ${locked ? 'locked' : ''}">
      <span class="big">${locked ? '🔒' : item.emoji}</span><b>${esc(item.name)}</b><p>${esc(item.desc)}</p>
      <button class="btn ${poor || locked || owned ? '' : 'primary'}" data-do="buy" data-arg="${item.id}" ${locked || owned ? 'disabled' : ''}>
        ${locked ? t('common.level', { n: item.level }) : owned ? t('barn.full') : `🪙 ${item.price}`}</button></article>`;
  }).join('')}</div>`;
}

function animalsTab(s) {
  const animals = s.animals.length
    ? s.animals.map((a, i) => {
      const def = ANIMALS[a.type];
      return `<div class="store-item"><span class="big">${def.emoji}</span>
        <div><b>${esc(def.name)} ${a.ready ? def.productEmoji : ''}</b><small>${t('barn.hunger')}</small>${bar(a.hunger, a.hunger > 60 ? 'pests' : 'growth')}</div>
        <button class="btn" data-do="feed" data-arg="${i}">${t('barn.feed')}</button>
        <button class="btn ${a.ready ? 'primary' : ''}" data-do="collect" data-arg="${i}" ${a.ready ? '' : 'disabled'}>${t('barn.collect', { emoji: def.productEmoji })}</button></div>`;
    }).join('')
    : `<p class="muted">${t('barn.noAnimals')}</p>`;
  return `<h4>${t('barn.animals')}</h4><div class="store-list">${animals}</div>
    <h4>${t('barn.hives', { n: s.hives, h: Math.round(s.beeHealth) })}</h4>
    <p class="muted">${t('barn.beesQuestion')}</p>
    <button class="btn" data-do="removeHive" ${s.hives ? '' : 'disabled'}>${t('barn.removeHive')}</button>`;
}

// ── Quiz ────────────────────────────────────────────────────
/** Pick n questions for the player's level (unmastered ones first), in the current language. */
export function pickQuestions(state, n = 5, rng = Math.random) {
  const maxLevel = state.level >= 4 ? 3 : state.level >= 2 ? 2 : 1;
  const pool = QUIZZES.filter((q) => q.level <= maxLevel);
  const fresh = pool.filter((q) => !state.quizMastered.includes(q.id));
  const shuffle = (arr) => arr.map((v) => [rng(), v]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  const chosen = shuffle(fresh).slice(0, n);
  if (chosen.length < n) chosen.push(...shuffle(pool.filter((q) => !chosen.includes(q))).slice(0, n - chosen.length));
  // Shuffle the answer order too, so the right answer is not always "A".
  return chosen.map((q) => {
    const options = q.options;
    const order = shuffle(options.map((_, i) => i));
    return { id: q.id, level: q.level, q: q.q, explain: q.explain, options: order.map((i) => options[i]), answer: order.indexOf(q.answer) };
  });
}

export function openQuiz(game) {
  const questions = pickQuestions(game.state);
  let index = 0;
  let answered = null;
  let correct = 0;
  let coins = 0;
  openModal({
    name: 'quiz',
    title: t('quizUi.title'),
    className: 'quiz',
    render(body) {
      if (index >= questions.length) {
        const stars = correct === questions.length ? '⭐⭐⭐' : correct >= questions.length * 0.6 ? '⭐⭐' : '⭐';
        body.innerHTML = `<div class="quiz-end"><div class="owl-big">${owlSVG()}</div>
          <h3>${stars}</h3><p>${t('quizUi.score', { c: correct, n: questions.length, coins })}</p>
          <p class="muted">${correct === questions.length ? t('quizUi.perfect') : t('quizUi.tryAgain')}</p>
          <div class="row"><button class="btn primary" data-again>${t('quizUi.again')}</button><button class="btn" data-close>${t('quizUi.backToFarm')}</button></div></div>`;
        $('[data-again]', body).addEventListener('click', () => { closeModal(true); openQuiz(game); });
        return;
      }
      const q = questions[index];
      const letters = t('quizUi.letters');
      body.innerHTML = `
        <div class="quiz-top"><span>${t('quizUi.progress', { i: index + 1, n: questions.length })}</span><span class="dots">${questions.map((_, i) => `<i class="${i < index ? 'done' : i === index ? 'now' : ''}"></i>`).join('')}</span></div>
        <h3 class="question">${esc(q.q)}</h3>
        <div class="answers">${q.options.map((o, i) => {
          let cls = '';
          if (answered !== null) cls = i === q.answer ? 'right' : i === answered ? 'wrong' : 'dim';
          return `<button class="answer ${cls}" data-answer="${i}" ${answered !== null ? 'disabled' : ''}><span>${letters[i]}</span>${esc(o)}</button>`;
        }).join('')}</div>
        ${answered !== null ? `<div class="explain ${answered === q.answer ? 'good' : 'bad'}"><b>${answered === q.answer ? t('quizUi.correct') : t('quizUi.wrong')}</b><p>${esc(q.explain)}</p>
          <button class="btn primary" data-next>${index + 1 < questions.length ? t('quizUi.nextQuestion') : t('quizUi.results')}</button></div>` : ''}`;
      $$('[data-answer]', body).forEach((b) => b.addEventListener('click', () => {
        answered = Number(b.dataset.answer);
        const r = game.handle('quizAnswer', { id: q.id, correct: answered === q.answer });
        if (answered === q.answer) { correct += 1; coins += r?.coins || 0; }
        refreshModal();
      }));
      $('[data-next]', body)?.addEventListener('click', () => { index += 1; answered = null; refreshModal(); });
    },
  });
}

// ── Celebrations ────────────────────────────────────────────
export function confetti(container = document.body) {
  const box = el('<div class="confetti" aria-hidden="true"></div>');
  const colors = ['#ff5252', '#ffd740', '#69f0ae', '#40c4ff', '#e040fb', '#ffab40'];
  for (let i = 0; i < 60; i++) {
    const c = document.createElement('i');
    c.style.left = `${Math.random() * 100}%`;
    c.style.background = colors[i % colors.length];
    c.style.animationDelay = `${Math.random() * 0.5}s`;
    c.style.animationDuration = `${1.6 + Math.random() * 1.2}s`;
    c.style.transform = `rotate(${Math.random() * 360}deg)`;
    box.appendChild(c);
  }
  container.appendChild(box);
  setTimeout(() => box.remove(), 3500);
}

export function openCelebration({ title, icon, text, lesson, reward, button = t('celebrate.button'), onClose }) {
  confetti();
  openModal({
    name: 'celebrate',
    title,
    className: 'celebrate',
    onClose,
    render(body) {
      body.innerHTML = `<div class="celebrate-body">
        <div class="big-icon">${icon}</div>
        <p class="lead">${text}</p>
        ${reward ? `<div class="reward-row">${reward}</div>` : ''}
        ${lesson ? `<div class="lesson-box"><div class="owl-mini">${owlSVG()}</div><p>${lesson}</p></div>` : ''}
        <button class="btn primary big" data-close>${button}</button></div>`;
    },
  });
}

let introStep = 0;
/** First-time welcome. Step 1 also lets the child pick a language. */
export function openIntro(game, onDone, { keepStep = false } = {}) {
  if (!keepStep) introStep = 0;
  const steps = [['🦉', 's1t', 's1'], ['🌱', 's2t', 's2'], ['🐝', 's3t', 's3'], ['📜', 's4t', 's4']];
  openModal({
    name: 'intro',
    title: t('intro.title'),
    className: 'intro',
    dismissable: false,
    render(body) {
      const [icon, titleKey, textKey] = steps[introStep];
      const last = introStep === steps.length - 1;
      body.innerHTML = `<div class="intro-body">
        <div class="intro-art">${introStep === 0 ? `<div class="owl-big">${owlSVG()}</div>` : `<div class="big-icon">${icon}</div>`}</div>
        ${introStep === 0 ? `<div class="lang-row" role="group" aria-label="${esc(t('lang.choose'))}"><span class="muted">🌐 ${t('lang.choose')}</span><div class="row">${languageButtons('btn')}</div></div>` : ''}
        <h3>${t(`intro.${titleKey}`)}</h3><p class="lead">${t(`intro.${textKey}`)}</p>
        <div class="steps">${steps.map((_, i) => `<i class="${i === introStep ? 'now' : ''}"></i>`).join('')}</div>
        <div class="row">${introStep > 0 ? `<button class="btn" data-back>${t('common.back')}</button>` : ''}
        <button class="btn primary big" data-go>${last ? t('intro.go') : t('common.next')}</button></div></div>`;
      $('[data-back]', body)?.addEventListener('click', () => { introStep -= 1; refreshModal(); });
      $('[data-go]', body).addEventListener('click', () => {
        if (!last) { introStep += 1; refreshModal(); } else { closeModal(true); onDone(); }
      });
    },
  });
}

export function openSettings(game) {
  openModal({
    name: 'settings',
    title: t('settings.title'),
    className: 'settings',
    render(body) {
      const s = game.state;
      body.innerHTML = `
        <div class="setting-row"><span>${t('settings.language')}</span><div class="row">${languageButtons('btn')}</div></div>
        <div class="setting-row"><span>${t('settings.sound')}</span><button class="btn toggle ${s.settings.sound ? 'on' : ''}" data-do="toggleSound">${s.settings.sound ? t('common.on') : t('common.off')}</button></div>
        <div class="setting-row"><span>${t('settings.speed')}</span><div class="row">${[1, 2, 3].map((v) => `<button class="btn num ${s.settings.speed === v ? 'primary' : ''}" data-do="setSpeed" data-arg="${v}">${t('hud.speed', { n: v })}</button>`).join('')}</div></div>
        <h4>${t('settings.howTo')}</h4>
        <ul class="howto">${t('settings.howToList').map((li) => `<li>${li}</li>`).join('')}</ul>
        <h4>${t('settings.progress')}</h4>
        <p class="muted">${t('settings.autosave')}</p>
        <button class="btn danger" data-do="reset">${t('settings.reset')}</button>`;
      $$('[data-do]', body).forEach((b) => b.addEventListener('click', () => {
        if (b.dataset.do === 'reset') {
          if (confirm(t('settings.confirmReset'))) game.handle('reset');
          return;
        }
        game.handle(b.dataset.do, b.dataset.arg);
        refreshModal();
      }));
    },
  });
}
