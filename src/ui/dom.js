// Small DOM helpers used by all UI files.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Create an element from an HTML string. */
export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

/** Escape text before putting it inside HTML. */
export const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** A coloured progress bar. `value` 0-100. */
export const bar = (value, cls = '') =>
  `<div class="bar ${cls}"><i style="width:${Math.max(0, Math.min(100, value)).toFixed(0)}%"></i></div>`;
