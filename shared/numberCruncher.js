// Number Cruncher: a field of numbers that vary in colour and motion. The
// question asks to count numbers matching an attribute, e.g. "How many are blue?"

export const COLORS = ["blue", "black", "red"];

export function generate({ count = 10, rng = Math.random } = {}) {
  const numbers = [];
  for (let i = 0; i < count; i++) {
    const color = COLORS[Math.floor(rng() * COLORS.length)];
    const moving = rng() < 0.5;
    numbers.push({
      value: Math.floor(rng() * 9) + 1,
      color,
      moving,
      x: Math.floor(rng() * 70) + 5, // percent of play area
      y: Math.floor(rng() * 68) + 5,
      dx: moving ? (rng() < 0.5 ? -1 : 1) * (0.15 + rng() * 0.35) : 0,
      dy: moving ? (rng() < 0.5 ? -1 : 1) * (0.15 + rng() * 0.35) : 0,
      size: 30 + Math.floor(rng() * 10),
    });
  }

  const useColor = rng() < 0.5;
  let question, answer;
  if (useColor) {
    const target = COLORS[Math.floor(rng() * COLORS.length)];
    answer = numbers.filter((n) => n.color === target).length;
    question = `How many are ${target}?`;
  } else {
    answer = numbers.filter((n) => n.moving).length;
    question = "How many are moving?";
  }

  return { kind: "numberCruncher", numbers, question, answer };
}

export function isCorrect(payload, input) {
  return String(input).trim().replace(/^0+(?=\d)/, "") === String(payload.answer);
}
