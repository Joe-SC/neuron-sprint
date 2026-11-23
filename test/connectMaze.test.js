import { test } from "node:test";
import assert from "node:assert/strict";
import { SEQUENCE, generate, nextTarget } from "../shared/connectMaze.js";

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

test("sequence alternates A..M with 1..13", () => {
  const seq = SEQUENCE();
  assert.equal(seq.length, 26);
  assert.equal(seq[0], "A");
  assert.equal(seq[1], "1");
  assert.equal(seq[2], "B");
  assert.equal(seq[3], "2");
  assert.equal(seq[24], "M");
  assert.equal(seq[25], "13");
});

test("generates 26 non-overlapping circles with unique labels", () => {
  const p = generate({ rng: rng() });
  assert.equal(p.circles.length, 26);
  const labels = new Set(p.circles.map((c) => c.label));
  assert.equal(labels.size, 26);
  for (const c of p.circles) {
    assert.ok(c.x >= 12 && c.x <= 88);
    assert.ok(c.y >= 12 && c.y <= 88);
  }
});

test("nextTarget advances through the sequence", () => {
  assert.equal(nextTarget(0), "A");
  assert.equal(nextTarget(1), "1");
  assert.equal(nextTarget(2), "B");
  assert.equal(nextTarget(25), "13");
  assert.equal(nextTarget(26), null);
});
