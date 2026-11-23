// Calculations: arithmetic question generator + validation.
// Ops are +, - and x. Subtraction is never negative (a >= b).
// Shared by the server (generation + validation) and tests.

export const OPS = ["+", "-", "x"];

function randInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function generate({ count = 20, max = 20, rng = Math.random } = {}) {
  const questions = [];
  for (let i = 0; i < count; i++) {
    const op = OPS[Math.floor(rng() * OPS.length)];
    let a, b, answer;
    if (op === "+") {
      a = randInt(rng, 1, max);
      b = randInt(rng, 1, max);
      answer = a + b;
    } else if (op === "-") {
      a = randInt(rng, 2, max);
      b = randInt(rng, 1, a - 1); // keeps answers >= 1
      answer = a - b;
    } else {
      a = randInt(rng, 2, 9);
      b = randInt(rng, 2, 9);
      answer = a * b;
    }
    questions.push({ kind: "calculations", a, b, op, answer });
  }
  return questions;
}

// Tolerant string comparison: trims whitespace, drops leading zeros.
export function normalize(input) {
  return String(input).trim().replace(/^0+(?=\d)/, "");
}

export function isCorrect(question, input) {
  return normalize(input) === String(question.answer);
}
