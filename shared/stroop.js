// Stroop test: a colour word rendered in an ink colour. The correct answer is
// the INK colour (say/tap the colour of the letters, not the word).

export const COLORS = ["blue", "black", "yellow", "red"];

export function generate({ count = 30, mismatchRate = 0.7, rng = Math.random } = {}) {
  const items = [];
  for (let i = 0; i < count; i++) {
    const word = COLORS[Math.floor(rng() * COLORS.length)];
    let ink = COLORS[Math.floor(rng() * COLORS.length)];
    if (rng() < mismatchRate && COLORS.length > 1) {
      while (ink === word) ink = COLORS[Math.floor(rng() * COLORS.length)];
    }
    items.push({ kind: "stroop", word, ink, correct: ink, choices: COLORS.slice() });
  }
  return items;
}

export function isCorrect(item, answer) {
  return answer === item.ink;
}
