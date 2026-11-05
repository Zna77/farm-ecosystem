// ─────────────────────────────────────────────────────────────
// Translations (i18n = "internationalisation").
//
//   t('hud.coins')                    → "Coins" / "Pièces" / "العملات"
//   t('toast.levelReq', { n: 3 })     → fills {n} placeholders
//   t('compost.collected', { count }) → picks the right plural form
//
// Every piece of text the player sees comes from en.js, fr.js or ar.js.
// English is the fallback if a key is missing in another language.
// ─────────────────────────────────────────────────────────────
import en from './en.js';
import fr from './fr.js';
import ar from './ar.js';

export const LANG_KEY = 'farm-ecosystem-lang';
export const DEFAULT_LANG = 'en';

export const LANGUAGES = [
  { code: 'en', label: 'English', short: 'EN', dir: 'ltr' },
  { code: 'fr', label: 'Français', short: 'FR', dir: 'ltr' },
  { code: 'ar', label: 'العربية', short: 'ع', dir: 'rtl' },
];

export const DICTIONARIES = { en, fr, ar };

const listeners = new Set();

function readSavedLanguage() {
  try {
    const saved = globalThis.localStorage?.getItem(LANG_KEY);
    return DICTIONARIES[saved] ? saved : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

let current = readSavedLanguage();

const lookup = (dict, key) => key.split('.').reduce((obj, part) => (obj == null ? undefined : obj[part]), dict);

/** Is this value a plural table like { one: '…', other: '…' }? */
const isPlural = (v) => v && typeof v === 'object' && !Array.isArray(v) && typeof v.other === 'string';

/** Translate a key. Missing keys fall back to English, then to the key itself. */
export function t(key, params = {}) {
  let value = lookup(DICTIONARIES[current], key);
  if (value === undefined) value = lookup(en, key);
  if (value === undefined) {
    if (globalThis.console) console.warn(`[i18n] Missing translation: ${key}`);
    return key;
  }
  if (isPlural(value)) {
    const rule = new Intl.PluralRules(current).select(Number(params.count ?? 0));
    value = value[rule] ?? value.other;
  }
  if (typeof value === 'string') {
    return value.replace(/\{(\w+)\}/g, (match, name) => (params[name] !== undefined ? params[name] : match));
  }
  return value; // arrays (e.g. quiz options) are returned as they are
}

export const getLanguage = () => current;
export const getLanguageInfo = (code = current) => LANGUAGES.find((l) => l.code === code);
export const isRTL = () => getLanguageInfo().dir === 'rtl';

/** Set <html lang> and <html dir> so the browser lays the page out correctly. */
export function applyDocumentLanguage() {
  const doc = globalThis.document;
  if (!doc) return;
  const info = getLanguageInfo();
  doc.documentElement.lang = info.code;
  doc.documentElement.dir = info.dir;
  doc.title = t('meta.title');
}

export function setLanguage(code) {
  if (!DICTIONARIES[code] || code === current) return false;
  current = code;
  try { globalThis.localStorage?.setItem(LANG_KEY, code); } catch { /* storage blocked */ }
  applyDocumentLanguage();
  listeners.forEach((fn) => fn(code));
  return true;
}

export function onLanguageChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Give a data object translated text properties.
 * localize(crop, 'crops.carrot', ['name', 'fact']) makes `crop.name`
 * return t('crops.carrot.name') in whatever language is active right now.
 */
export function localize(obj, prefix, fields) {
  for (const field of fields) {
    Object.defineProperty(obj, field, { get: () => t(`${prefix}.${field}`), enumerable: true, configurable: true });
  }
  return obj;
}
