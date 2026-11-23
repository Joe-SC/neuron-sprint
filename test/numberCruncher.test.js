import { test } from "node:test";
import assert from "node:assert/strict";
import { COLORS, generate, isCorrect } from "../shared/numberCruncher.js";

// mulberry32: fast, good consecutive-draw quality for seeded tests
function rng(seed = 1) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test("answer matches the attribute count", () => {
  for (let i = 0; i < 100; i++) {
    const p = generate({ rng: rng(i) });
    assert.equal(p.numbers.length, 10);
    if (p.question === "How many are moving?") {
      assert.equal(p.answer, p.numbers.filter((n) => n.moving).length);
    } else {
      const target = p.question.replace("How many are ", "").replace("?", "").trim();
      assert.ok(COLORS.includes(target), `unknown color in "${p.question}"`);
      assert.equal(p.answer, p.numbers.filter((n) => n.color === target).length);
    }
    assert.equal(isCorrect(p, String(p.answer)), true);
    assert.equal(isCorrect(p, String(p.answer + 1)), false);
  }
});

test("all numbers have valid attributes", () => {
  const p = generate({ rng: rng() });
  for (const n of p.numbers) {
    assert.ok(COLORS.includes(n.color));
    assert.equal(n.moving, n.dx !== 0 || n.dy !== 0);
    assert.ok(n.x >= 5 && n.x <= 75);
    assert.ok(n.y >= 5 && n.y <= 73);
  }
});
