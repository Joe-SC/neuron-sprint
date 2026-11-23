import { test } from "node:test";
import assert from "node:assert/strict";
import { COLORS, generate, isCorrect } from "../shared/stroop.js";

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

test("correct answer is the ink colour, not the word", () => {
  const [item] = generate({ count: 1, rng: rng() });
  assert.ok(COLORS.includes(item.ink));
  assert.ok(COLORS.includes(item.word));
  assert.equal(item.correct, item.ink);
  assert.equal(isCorrect(item, item.ink), true);
});

test("roughly 70% of items are mismatched", () => {
  const items = generate({ count: 300, rng: rng() });
  const mismatch = items.filter((i) => i.word !== i.ink).length;
  const rate = mismatch / items.length;
  assert.ok(rate > 0.85, `mismatch rate ${rate} (expected > 0.85)`);
});

test("always produces some mismatches and some matches", () => {
  const items = generate({ count: 50, rng: rng() });
  assert.ok(items.some((i) => i.word !== i.ink));
  assert.ok(items.some((i) => i.word === i.ink));
});

test("wrong colour is rejected", () => {
  const [item] = generate({ count: 1, rng: rng() });
  const wrong = COLORS.find((c) => c !== item.ink);
  assert.equal(isCorrect(item, wrong), false);
});
