// Translation tests: every language must have every key, and the game
// must produce text in the chosen language. Run with: npm test
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { DICTIONARIES, LANGUAGES, t, setLanguage, getLanguage } from '../src/translations/index.js';
import { CROPS } from '../src/data/crops.js';
import { MISSIONS } from '../src/data/missions.js';
import { QUIZZES } from '../src/data/quizzes.js';
import { ACHIEVEMENTS } from '../src/data/achievements.js';
import { DISCOVERIES, WEB_NODES } from '../src/data/discoveries.js';
import { SHOP } from '../src/data/shop.js';
import { createState } from '../src/engine/state.js';
import * as A from '../src/engine/actions.js';
import { clearListeners } from '../src/engine/bus.js';

const isPlural = (v) => v && typeof v === 'object' && !Array.isArray(v) && typeof v.other === 'string';

/** Flatten { a: { b: 'x' } } into { 'a.b': 'x' }. Arrays and plural tables are leaves. */
function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v) && !isPlural(v)) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}

const placeholders = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

afterEach(() => setLanguage('en'));

describe('translations are complete', () => {
  const en = flatten(DICTIONARIES.en);

  for (const lang of ['fr', 'ar']) {
    const other = flatten(DICTIONARIES[lang]);

    it(`${lang} has exactly the same keys as English`, () => {
      expect(Object.keys(other).filter((k) => !(k in en))).toEqual([]);
      expect(Object.keys(en).filter((k) => !(k in other))).toEqual([]);
    });

    it(`${lang} has no empty strings, same array lengths and same {placeholders}`, () => {
      for (const [key, value] of Object.entries(en)) {
        const v = other[key];
        if (Array.isArray(value)) {
          expect(v, key).toHaveLength(value.length);
          v.forEach((s) => expect(s.trim().length, key).toBeGreaterThan(0));
        } else if (isPlural(value)) {
          expect(isPlural(v), key).toBe(true);
          expect(placeholders(v.other), key).toEqual(placeholders(value.other));
        } else {
          expect(typeof v, key).toBe('string');
          expect(v.trim().length, key).toBeGreaterThan(0);
          expect(placeholders(v), key).toEqual(placeholders(value));
        }
      }
    });
  }

  it('every game object has text in every language', () => {
    for (const { code } of LANGUAGES) {
      setLanguage(code);
      const texts = [
        ...Object.values(CROPS).flatMap((c) => [c.name, c.fact]),
        ...MISSIONS.flatMap((m) => [m.title, m.desc, m.lesson]),
        ...ACHIEVEMENTS.flatMap((a) => [a.title, a.desc]),
        ...DISCOVERIES.flatMap((d) => [d.title, d.text]),
        ...Object.values(WEB_NODES).map((n) => n.label),
        ...SHOP.flatMap((i) => [i.name, i.desc]),
        ...QUIZZES.flatMap((q) => [q.q, q.explain, ...q.options]),
      ];
      for (const text of texts) {
        expect(typeof text).toBe('string');
        expect(text).not.toMatch(/^(crops|missions|achievements|discoveries|nodes|shop|quiz)\./); // not a raw key
      }
      for (const q of QUIZZES) expect(q.options[q.answer]).toBeTruthy();
    }
  });

  it('uses the required agricultural vocabulary', () => {
    const all = (lang) => JSON.stringify(DICTIONARIES[lang]);
    for (const word of ['التربة', 'الري', 'التلقيح', 'السماد', 'الحصاد', 'التنوع البيولوجي', 'النظام البيئي', 'السماد العضوي']) {
      expect(all('ar'), word).toContain(word);
    }
    for (const word of ['Le sol', 'L’irrigation', 'pollinisation', 'engrais', 'récolte', 'La biodiversité', 'écosystème', 'compost']) {
      expect(all('fr'), word).toContain(word);
    }
  });
});

describe('t() and language switching', () => {
  it('defaults to English and switches language', () => {
    expect(getLanguage()).toBe('en');
    expect(t('hud.journal')).toBe('Journal');
    setLanguage('fr');
    expect(t('barn.sell')).toBe('Vendre');
    setLanguage('ar');
    expect(t('barn.sell')).toBe('بِع');
  });

  it('fills placeholders and chooses plural forms', () => {
    expect(t('common.level', { n: 4 })).toBe('Level 4');
    expect(t('msg.compostCollected', { count: 1 })).toContain('1 bag ');
    expect(t('msg.compostCollected', { count: 3 })).toContain('3 bags');
    setLanguage('ar');
    expect(t('msg.compostCollected', { count: 2 })).toContain('كيسين');
    expect(t('msg.compostCollected', { count: 5 })).toContain('5 أكياس');
  });

  it('falls back to the key for unknown text', () => {
    expect(t('does.not.exist')).toBe('does.not.exist');
  });

  it('engine messages come out in the chosen language', () => {
    clearListeners();
    const s = createState();
    setLanguage('fr');
    expect(A.plant(s, 0, 'carrot').msg).toContain('Carotte');
    setLanguage('ar');
    expect(A.water(s, 0).msg).toContain('الجذور');
  });
});

describe('no hardcoded interface text', () => {
  it('UI and engine files do not contain English sentences outside comments', () => {
    const dirs = ['src/ui', 'src/engine', 'src/data'];
    const offenders = [];
    for (const dir of dirs) {
      for (const file of readdirSync(dir)) {
        const code = readFileSync(`${dir}/${file}`, 'utf8')
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
        // Text between tags like >Hello world< or quoted sentences of 3+ words starting with a capital
        const hits = code.match(/>\s*[A-Z][a-z]+(?: [a-z]+){1,}\s*</g) || [];
        const quoted = code.match(/['"`][A-Z][a-z]+(?: [a-z']+){2,}[.!?]?['"`]/g) || [];
        hits.concat(quoted).forEach((h) => offenders.push(`${dir}/${file}: ${h}`));
      }
    }
    expect(offenders).toEqual([]);
  });
});
