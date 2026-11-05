// Hand-made SVG illustrations. Each function returns an SVG string.
// Drawing with code keeps the game tiny (no image files) and lets us
// change colours and shapes depending on the game state.

// ── Plants ───────────────────────────────────────────────────
const leaf = (cx, cy, rx, ry, rot, fill) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${cx} ${cy})" fill="${fill}"/>`;

const stem = (x, top, color = '#558b2f', w = 3) =>
  `<path d="M${x} 90 Q${x - 2} ${(90 + top) / 2} ${x} ${top}" stroke="${color}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;

const emojiAt = (e, x, y, size) =>
  `<text x="${x}" y="${y}" font-size="${size}" text-anchor="middle" dominant-baseline="central">${e}</text>`;

const flowerDot = (x, y, color, r = 4) =>
  `<g><circle cx="${x - r}" cy="${y}" r="${r}" fill="${color}"/><circle cx="${x + r}" cy="${y}" r="${r}" fill="${color}"/>` +
  `<circle cx="${x}" cy="${y - r}" r="${r}" fill="${color}"/><circle cx="${x}" cy="${y + r}" r="${r}" fill="${color}"/>` +
  `<circle cx="${x}" cy="${y}" r="${r * 0.8}" fill="#ffb300"/></g>`;

function sunflowerHead(x, y, size, color) {
  let petals = '';
  for (let i = 0; i < 12; i++) {
    petals += `<ellipse cx="${x}" cy="${y - size}" rx="${size * 0.35}" ry="${size * 0.8}" transform="rotate(${i * 30} ${x} ${y})" fill="${color}"/>`;
  }
  return `<g>${petals}<circle cx="${x}" cy="${y}" r="${size * 0.75}" fill="#6d4c41"/><circle cx="${x - 2}" cy="${y - 2}" r="${size * 0.3}" fill="#8d6e63"/></g>`;
}

/**
 * Draw a crop at a growth stage.
 * stage: 0 seed · 1 sprout · 2 young · 3 flowering · 4 ripe
 */
export function plantSVG(crop, stage) {
  const L = crop.leaf;
  const dark = '#33691e';
  let g = '';

  if (stage === 0) {
    g = `<ellipse cx="50" cy="88" rx="14" ry="5" fill="#5d4037" opacity=".55"/>
         <ellipse cx="50" cy="85" rx="5" ry="3.5" fill="#a1887f"/>
         <path d="M50 83 q2 -5 5 -6" stroke="#9ccc65" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  } else if (stage === 1) {
    g = stem(50, 70) + leaf(43, 70, 8, 4, -25, L) + leaf(57, 70, 8, 4, 25, L);
  } else if (crop.shape === 'grass') {
    const ripe = stage === 4;
    const blade = ripe ? '#d4a64a' : L;
    const top = stage === 2 ? 55 : 30;
    for (const [x, bend] of [[38, -8], [44, -3], [50, 0], [56, 3], [62, 8]]) {
      g += `<path d="M${x} 90 Q${x + bend / 2} ${(90 + top) / 2} ${x + bend} ${top + Math.abs(bend)}" stroke="${blade}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
      if (stage >= 3) {
        const head = ripe ? '#f0c75e' : '#c5e1a5';
        for (let k = 0; k < 4; k++) g += leaf(x + bend, top + Math.abs(bend) - 4 - k * 5, 2.6, 4, bend * 2, head);
      }
    }
  } else if (crop.shape === 'leafy') {
    const n = stage === 2 ? 5 : 9;
    const h = stage === 2 ? 52 : 34;
    for (let i = 0; i < n; i++) {
      const a = -60 + (120 / (n - 1)) * i;
      const x2 = 50 + Math.sin((a * Math.PI) / 180) * 30;
      const y2 = 88 - Math.cos((a * Math.PI) / 180) * (88 - h);
      g += `<path d="M50 88 Q${(50 + x2) / 2} ${y2 + 10} ${x2} ${y2}" stroke="${L}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
      g += leaf(x2, y2, 4, 7, a, L);
    }
    if (stage === 4) g += `<path d="M42 86 Q50 112 58 86 Z" fill="#ff8f00"/><ellipse cx="50" cy="86" rx="8" ry="3" fill="#ffa726"/>`;
  } else if (crop.shape === 'tall') {
    const top = stage === 2 ? 50 : 22;
    g = stem(50, top, dark, 4) + leaf(38, 70, 12, 6, -30, L) + leaf(62, 62, 12, 6, 30, L);
    if (stage === 2) g += leaf(42, 54, 8, 4, -30, L);
    if (stage === 3) g += `<circle cx="50" cy="${top}" r="8" fill="#7cb342"/>` + sunflowerHead(50, top, 9, crop.flower);
    if (stage === 4) g += sunflowerHead(50, top, 15, crop.flower);
  } else if (crop.shape === 'sprawl') {
    g = leaf(32, 78, 14, 9, -15, L) + leaf(68, 76, 14, 9, 15, L) + leaf(50, 70, 13, 10, 0, '#7cb342');
    g += `<path d="M20 84 Q35 70 50 82 T82 80" stroke="${dark}" stroke-width="2.5" fill="none"/>`;
    if (stage >= 3) g += flowerDot(30, 64, crop.flower, 4) + flowerDot(70, 62, crop.flower, 4);
    if (stage === 4) g += emojiAt(crop.emoji, 50, 76, 34);
  } else {
    // vine & bush (beans, tomatoes, strawberries)
    const top = crop.shape === 'bush' ? (stage === 2 ? 62 : 52) : stage === 2 ? 50 : 26;
    if (crop.shape === 'vine') g += `<path d="M50 90 V${top - 6}" stroke="#a1887f" stroke-width="2"/>`; // stake
    g += stem(50, top, dark, 3);
    const leaves = crop.shape === 'bush'
      ? [[36, 80, -40], [64, 80, 40], [42, 68, -20], [58, 68, 20], [50, top + 4, 0]]
      : [[40, 78, -35], [60, 72, 35], [40, 60, -35], [60, 52, 35], [44, top + 8, -20]];
    for (const [x, y, r] of leaves.slice(0, stage === 2 ? 3 : 5)) g += leaf(x, y, 9, 5, r, L);
    if (stage === 3) g += flowerDot(36, top + 18, crop.flower, 3.4) + flowerDot(64, top + 10, crop.flower, 3.4) + flowerDot(50, top, crop.flower, 3.4);
    if (stage === 4) {
      const size = crop.shape === 'bush' ? 17 : 18;
      g += emojiAt(crop.emoji, 36, top + 22, size) + emojiAt(crop.emoji, 64, top + 14, size) + emojiAt(crop.emoji, 50, top + 2, size);
    }
  }
  return `<svg class="plant-svg" viewBox="0 0 100 100" aria-hidden="true">${g}</svg>`;
}

// ── Buildings & nature ───────────────────────────────────────
export const barnSVG = () => `
<svg viewBox="0 0 200 180" aria-hidden="true">
  <ellipse cx="100" cy="172" rx="92" ry="8" fill="#000" opacity=".12"/>
  <rect x="22" y="70" width="156" height="100" rx="4" fill="#d84d3f"/>
  <rect x="22" y="70" width="156" height="100" rx="4" fill="url(#barnShade)"/>
  <path d="M10 76 L100 14 L190 76 Z" fill="#7b3b2e"/>
  <path d="M22 76 L100 26 L178 76" fill="none" stroke="#fff" stroke-width="7" stroke-linejoin="round"/>
  <rect x="80" y="40" width="40" height="26" rx="3" fill="#fff6e0" stroke="#fff" stroke-width="5"/>
  <path d="M84 44 L116 62 M116 44 L84 62" stroke="#c9a46a" stroke-width="3"/>
  <rect x="64" y="100" width="72" height="70" fill="#a8382c" stroke="#fff" stroke-width="6"/>
  <path d="M64 100 L136 170 M136 100 L64 170" stroke="#fff" stroke-width="6"/>
  <rect x="34" y="96" width="20" height="20" fill="#fff6e0" stroke="#fff" stroke-width="4"/>
  <rect x="146" y="96" width="20" height="20" fill="#fff6e0" stroke="#fff" stroke-width="4"/>
  <defs><linearGradient id="barnShade" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity=".15"/></linearGradient></defs>
</svg>`;

export const hiveSVG = () => `
<svg viewBox="0 0 80 90" aria-hidden="true">
  <ellipse cx="40" cy="86" rx="30" ry="4" fill="#000" opacity=".15"/>
  <rect x="30" y="70" width="20" height="16" fill="#8d6e63"/>
  <path d="M10 72 Q8 20 40 12 Q72 20 70 72 Z" fill="#f7c948"/>
  <path d="M12 60 H68 M11 47 H69 M15 34 H65 M23 22 H57" stroke="#d99e1b" stroke-width="4" stroke-linecap="round"/>
  <ellipse cx="40" cy="62" rx="9" ry="7" fill="#5d4037"/>
</svg>`;

export const compostSVG = (fill = 0.5) => {
  const h = 10 + fill * 34;
  return `
<svg viewBox="0 0 110 90" aria-hidden="true">
  <ellipse cx="55" cy="86" rx="50" ry="4" fill="#000" opacity=".15"/>
  <rect x="10" y="${80 - h}" width="90" height="${h}" fill="#5d4037"/>
  <circle cx="30" cy="${82 - h}" r="6" fill="#8bc34a"/><circle cx="62" cy="${84 - h}" r="5" fill="#ff8a65"/><circle cx="80" cy="${82 - h}" r="5" fill="#aed581"/>
  <rect x="6" y="30" width="98" height="12" rx="3" fill="#b07a4f"/>
  <rect x="6" y="48" width="98" height="12" rx="3" fill="#a06b42"/>
  <rect x="6" y="66" width="98" height="14" rx="3" fill="#b07a4f"/>
  <rect x="6" y="28" width="10" height="56" rx="3" fill="#8a5a36"/>
  <rect x="94" y="28" width="10" height="56" rx="3" fill="#8a5a36"/>
  <g class="worm"><path d="M70 30 q6 -10 12 -2 q4 6 10 -2" stroke="#f48fb1" stroke-width="6" fill="none" stroke-linecap="round"/><circle cx="91" cy="26" r="1.6" fill="#333"/></g>
</svg>`;
};

export const pondSVG = () => `
<svg viewBox="0 0 220 120" aria-hidden="true">
  <ellipse cx="110" cy="66" rx="104" ry="48" fill="#8d6e63" opacity=".35"/>
  <ellipse cx="110" cy="62" rx="98" ry="44" fill="#4fc3f7"/>
  <ellipse cx="110" cy="62" rx="98" ry="44" fill="url(#pondG)"/>
  <ellipse class="ripple" cx="90" cy="58" rx="20" ry="6" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2"/>
  <ellipse cx="150" cy="72" rx="16" ry="7" fill="#66bb6a"/><path d="M150 72 L166 68" stroke="#4fc3f7" stroke-width="3"/>
  <circle cx="146" cy="66" r="4" fill="#f8bbd0"/>
  <g stroke="#689f38" stroke-width="3" stroke-linecap="round"><path d="M20 70 V30"/><path d="M28 72 V40"/><path d="M200 66 V34"/></g>
  <g fill="#795548"><rect x="17" y="26" width="6" height="14" rx="3"/><rect x="197" y="30" width="6" height="14" rx="3"/></g>
  <defs><radialGradient id="pondG" cx=".4" cy=".35"><stop offset="0" stop-color="#e1f5fe" stop-opacity=".7"/><stop offset="1" stop-color="#0288d1" stop-opacity=".3"/></radialGradient></defs>
</svg>`;

export const treeSVG = (fruit = '#e53935') => `
<svg viewBox="0 0 120 150" aria-hidden="true">
  <ellipse cx="60" cy="144" rx="40" ry="6" fill="#000" opacity=".15"/>
  <path d="M52 144 L56 90 H66 L70 144 Z" fill="#8d6e63"/>
  <circle cx="60" cy="58" r="42" fill="#43a047"/>
  <circle cx="34" cy="72" r="26" fill="#388e3c"/><circle cx="88" cy="70" r="26" fill="#388e3c"/>
  <circle cx="48" cy="40" r="22" fill="#66bb6a"/>
  <g fill="${fruit}"><circle cx="40" cy="62" r="5"/><circle cx="76" cy="52" r="5"/><circle cx="64" cy="82" r="5"/><circle cx="86" cy="80" r="5"/></g>
</svg>`;

export const fenceSVG = () => `
<svg viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true">
  <g fill="#f5deb3" stroke="#c9a46a" stroke-width="2">
    <rect x="0" y="12" width="200" height="6"/><rect x="0" y="26" width="200" height="6"/>
    ${[4, 44, 84, 124, 164, 192].map((x) => `<path d="M${x} 38 V6 l3 -4 l3 4 V38 Z"/>`).join('')}
  </g>
</svg>`;

export const scarecrowSVG = () => `
<svg viewBox="0 0 60 90" aria-hidden="true">
  <path d="M30 90 V30 M10 40 H50" stroke="#8d6e63" stroke-width="4"/>
  <path d="M18 40 H42 L38 66 H22 Z" fill="#5c6bc0"/>
  <circle cx="30" cy="26" r="10" fill="#ffe0b2"/>
  <path d="M16 20 H44 L36 8 H24 Z" fill="#a1887f"/>
  <circle cx="26" cy="26" r="1.5"/><circle cx="34" cy="26" r="1.5"/>
  <path d="M26 31 Q30 34 34 31" stroke="#000" fill="none"/>
</svg>`;

// ── Mascot: Professor Hoot the owl ───────────────────────────
export const owlSVG = () => `
<svg class="owl" viewBox="0 0 120 130" aria-hidden="true">
  <path d="M22 30 L34 10 L44 30 Z M98 30 L86 10 L76 30 Z" fill="#8d5a3b"/>
  <ellipse cx="60" cy="72" rx="44" ry="50" fill="#a86b45"/>
  <ellipse cx="60" cy="86" rx="28" ry="32" fill="#f3d9b1"/>
  <path d="M44 80 q4 4 8 0 M56 90 q4 4 8 0 M68 80 q4 4 8 0 M50 100 q4 4 8 0 M62 100 q4 4 8 0" stroke="#d8b78a" stroke-width="2" fill="none"/>
  <ellipse cx="18" cy="80" rx="10" ry="26" fill="#8d5a3b" class="wing-l"/>
  <ellipse cx="102" cy="80" rx="10" ry="26" fill="#8d5a3b" class="wing-r"/>
  <g class="eyes">
    <circle cx="42" cy="48" r="17" fill="#fff"/><circle cx="78" cy="48" r="17" fill="#fff"/>
    <circle cx="44" cy="50" r="8" fill="#3e2723"/><circle cx="76" cy="50" r="8" fill="#3e2723"/>
    <circle cx="47" cy="46" r="3" fill="#fff"/><circle cx="79" cy="46" r="3" fill="#fff"/>
  </g>
  <g fill="none" stroke="#3e2723" stroke-width="3"><circle cx="42" cy="48" r="19"/><circle cx="78" cy="48" r="19"/><path d="M61 46 h-2"/></g>
  <path d="M54 62 L60 74 L66 62 Z" fill="#ff9800"/>
  <path d="M40 120 l-4 8 M46 121 l0 8 M74 121 l0 8 M80 120 l4 8" stroke="#ff9800" stroke-width="4" stroke-linecap="round"/>
</svg>`;

// ── Sky background ───────────────────────────────────────────
export const backgroundSVG = () => `
<svg class="bg-svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs>
    <linearGradient id="grass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#9ccc65"/><stop offset="1" stop-color="#7cb342"/>
    </linearGradient>
  </defs>
  <path d="M0 330 Q200 220 420 300 T860 280 T1300 290 T1600 260 V1000 H0 Z" fill="#a5d6a7"/>
  <path d="M0 380 Q300 290 650 360 T1250 340 T1600 330 V1000 H0 Z" fill="#81c784"/>
  <rect x="0" y="400" width="1600" height="600" fill="url(#grass)"/>
  <path d="M0 410 Q400 380 800 410 T1600 405 V430 H0 Z" fill="#8bc34a"/>
  <g fill="#689f38" opacity=".55">
    ${Array.from({ length: 40 }, (_, i) => {
      const x = (i * 397) % 1600;
      const y = 470 + ((i * 211) % 500);
      return `<path d="M${x} ${y} l4 -14 l4 14 M${x + 10} ${y} l3 -10 l3 10"/>`;
    }).join('')}
  </g>
  <g>
    ${[[160, 520, '#f48fb1'], [1450, 560, '#fff176'], [1500, 900, '#ce93d8'], [90, 930, '#fff176'], [720, 960, '#f48fb1']].map(([x, y, c]) =>
      `<g transform="translate(${x} ${y})"><circle r="7" cx="-7" fill="${c}"/><circle r="7" cx="7" fill="${c}"/><circle r="7" cy="-7" fill="${c}"/><circle r="7" cy="7" fill="${c}"/><circle r="5" fill="#ffb300"/></g>`).join('')}
  </g>
</svg>`;

export const cloudSVG = () => `
<svg viewBox="0 0 160 70" aria-hidden="true"><g fill="#fff">
  <circle cx="45" cy="42" r="24"/><circle cx="80" cy="30" r="28"/><circle cx="115" cy="42" r="22"/><rect x="40" y="40" width="80" height="26" rx="13"/>
</g></svg>`;
