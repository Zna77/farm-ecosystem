// ─────────────────────────────────────────────────────────────
// Emoji fallbacks for older phones.
//
// Some emoji the game uses are fairly new (for example 🪙 coin and 🪱 worm
// arrived with Android 11). Older Android phones draw them as empty boxes
// ("tofu"). At start-up we test each risky emoji on a hidden canvas. Only if
// the device can't draw it do we swap it, everywhere on the page, for an
// older emoji that every phone has. Modern devices change nothing.
//
// Test the fallbacks on any device by opening the game with ?emoji=fallback
// ─────────────────────────────────────────────────────────────

// Newer emoji → older replacement (Emoji version that introduced it)
const FALLBACKS = [
  ['❤️‍🩹', '❤️'], // 13.1 – mending heart (ZWJ sequence, check before plain ❤️)
  ['🪙', '💰'], //   13.0 – coin
  ['🪱', '🐛'], //   13.0 – worm
  ['🫘', '🥜'], //   14.0 – beans
  ['🟫', '🌍'], //   12.0 – brown square (soil)
  ['🟤', '🌰'], //   12.0 – brown circle (compost)
  ['🥵', '😓'], //   11.0 – hot face
  ['🧺', '👜'], //   11.0 – basket
  ['🧴', '💨'], //   11.0 – spray bottle
];

const draw = (ctx, text) => {
  ctx.clearRect(0, 0, 40, 40);
  ctx.fillText(text, 2, 4);
  return ctx.getImageData(0, 0, 40, 40).data;
};

const isColourful = (data) => {
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 100 && Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2]) > 40) return true;
  }
  return false;
};

const samePixels = (a, b) => {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
};

/**
 * Can this device draw the emoji as a single picture?
 * `missing` is how the device draws a character no font has (an empty box, or
 * nothing). A supported emoji is colourful or, for grey ones like Apple's 🪙,
 * at least looks different from that "missing" glyph.
 */
function canDraw(emoji, ctx, missing) {
  const data = draw(ctx, emoji);
  if (!isColourful(data) && samePixels(data, missing)) return false;
  // Combined emoji (with an invisible joiner) that aren't supported show up as two pictures side by side.
  if (emoji.includes('‍')) return ctx.measureText(emoji).width < ctx.measureText('😀').width * 1.5;
  return true;
}

/** Work out which emoji need replacing on this device. */
export function findUnsupportedEmoji(force = false) {
  if (force) return FALLBACKS.slice();
  try {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 40;
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];
    ctx.textBaseline = 'top';
    ctx.font = '28px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    ctx.fillStyle = '#000';
    if (!isColourful(draw(ctx, '😀'))) return []; // canvas blocked or no colour emoji at all: change nothing
    const missing = draw(ctx, '\u{10FFFD}').slice(); // a private-use character that no font draws
    return FALLBACKS.filter(([emoji]) => !canDraw(emoji, ctx, missing));
  } catch {
    return []; // canvas reading blocked by privacy settings: keep everything as it is
  }
}

/**
 * Replace unsupported emoji everywhere in the page, now and whenever new
 * content is added. Returns the list of replacements in use.
 */
export function installEmojiFallbacks() {
  let force = false;
  try { force = new URLSearchParams(location.search).get('emoji') === 'fallback'; } catch { /* ignore */ }
  const swaps = findUnsupportedEmoji(force);
  if (!swaps.length || typeof MutationObserver === 'undefined') return swaps;

  const fix = (text) => {
    let out = text;
    for (const [from, to] of swaps) if (out.indexOf(from) !== -1) out = out.split(from).join(to);
    return out;
  };
  const ATTRS = ['title', 'aria-label'];

  const fixNode = (node) => {
    if (node.nodeType === 3) { // text
      const fixed = fix(node.nodeValue);
      if (fixed !== node.nodeValue) node.nodeValue = fixed;
      return;
    }
    if (node.nodeType !== 1) return;
    for (const attr of ATTRS) {
      const value = node.getAttribute(attr);
      if (value) { const fixed = fix(value); if (fixed !== value) node.setAttribute(attr, fixed); }
    }
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (n.nodeType === 3) {
        const fixed = fix(n.nodeValue);
        if (fixed !== n.nodeValue) n.nodeValue = fixed;
      } else {
        for (const attr of ATTRS) {
          const value = n.getAttribute(attr);
          if (value) { const fixed = fix(value); if (fixed !== value) n.setAttribute(attr, fixed); }
        }
      }
    }
  };

  new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'characterData') fixNode(m.target);
      else if (m.type === 'attributes') fixNode(m.target.nodeType === 1 ? m.target : m.target.parentNode);
      else m.addedNodes.forEach(fixNode);
    }
  }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });

  fixNode(document.body);
  document.documentElement.classList.add('emoji-fallback');
  return swaps;
}
