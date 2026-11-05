// Tiny sound effects made with the Web Audio API – no audio files needed.
let ctx = null;
let enabled = true;

export function setSoundEnabled(v) {
  enabled = v;
}

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, start, dur, type = 'sine', vol = 0.15, slideTo = null) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + start;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

const SOUNDS = {
  click: () => tone(660, 0, 0.08, 'triangle', 0.08),
  plant: () => { tone(300, 0, 0.12, 'sine', 0.15, 500); tone(500, 0.08, 0.1, 'sine', 0.1); },
  water: () => { tone(900, 0, 0.15, 'sine', 0.08, 300); tone(700, 0.08, 0.15, 'sine', 0.06, 250); },
  harvest: () => [523, 659, 784].forEach((f, i) => tone(f, i * 0.07, 0.15, 'triangle', 0.12)),
  coin: () => { tone(988, 0, 0.08, 'square', 0.05); tone(1319, 0.07, 0.15, 'square', 0.05); },
  error: () => tone(220, 0, 0.18, 'sawtooth', 0.05, 160),
  buzz: () => tone(180, 0, 0.3, 'sawtooth', 0.03, 220),
  pop: () => tone(400, 0, 0.08, 'sine', 0.1, 800),
  discover: () => [784, 988, 1175].forEach((f, i) => tone(f, i * 0.09, 0.2, 'sine', 0.1)),
  success: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.1, 0.25, 'triangle', 0.13)),
  wrong: () => { tone(330, 0, 0.15, 'triangle', 0.1); tone(262, 0.14, 0.25, 'triangle', 0.1); },
};

export function play(name) {
  if (!enabled) return;
  try { SOUNDS[name]?.(); } catch { /* audio not available */ }
}
