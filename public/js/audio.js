// Tiny Web Audio synth — no samples needed.

let ctx = null;

function getCtx() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (C) ctx = new C();
  }
  return ctx;
}

export function tone(freq, duration = 0.15, type = "square") {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.15, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + duration);
}

export function beepCorrect() { tone(880, 0.12); }
export function beepWrong() { tone(220, 0.2, "sawtooth"); }
export function beepWin() { tone(660, 0.1); setTimeout(() => tone(880, 0.15), 120); }
export function beepCountdown() { tone(440, 0.08); }
export function beepGo() { tone(660, 0.15, "triangle"); }