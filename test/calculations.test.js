import { test } from "node:test";
import assert from "node:assert/strict";
import { generate, isCorrect, normalize } from "../shared/calculations.js";

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

test("generates the requested count of valid questions", () => {
  const qs = generate({ count: 20, rng: rng() });
  assert.equal(qs.length, 20);
  for (const q of qs) {
    assert.ok(q.answer >= 1, "answer is positive");
    assert.equal(isCorrect(q, String(q.answer)), true);
    assert.equal(isCorrect(q, String(q.answer + 1)), false);
    if (q.op === "-") {
      assert.ok(q.a >= q.b, "subtraction never negative");
      assert.equal(q.a - q.b, q.answer);
    }
    if (q.op === "+") assert.equal(q.a + q.b, q.answer);
    if (q.op === "x") assert.equal(q.a * q.b, q.answer);
  }
});

test("subtraction guarantees a >= b across many draws", () => {
  for (let i = 0; i < 200; i++) {
    const [q] = generate({ count: 1, rng: rng(i) });
    if (q.op === "-") assert.ok(q.a >= q.b);
  }
});

test("accepts whitespace and leading zeros", () => {
  const q = { a: 7, b: 3, op: "+", answer: 10 };
  assert.equal(isCorrect(q, " 10 "), true);
  assert.equal(isCorrect(q, "010"), true);
  assert.equal(isCorrect(q, "10.0"), false);
});

test("normalize trims and strips leading zeros", () => {
  assert.equal(normalize("  42  "), "42");
  assert.equal(normalize("0042"), "42");
  assert.equal(normalize("0"), "0");
});
