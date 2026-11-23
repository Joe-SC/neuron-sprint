import { test } from "node:test";
import assert from "node:assert/strict";
import { generate, isCorrect } from "../shared/birdWatching.js";

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

test("answer equals the total number of distinct birds", () => {
  const p = generate({ rng: rng() });
  assert.equal(p.answer, p.birds.length);
  assert.ok(p.answer >= 3 && p.answer <= 15);
  assert.ok(p.durationMs > 0);
  assert.equal(isCorrect(p, String(p.answer)), true);
  assert.equal(isCorrect(p, String(p.answer + 1)), false);
});

test("bird timings are within the round and valid", () => {
  const p = generate({ rng: rng() });
  for (const b of p.birds) {
    assert.ok(b.spawnAt >= 0 && b.spawnAt < p.durationMs);
    assert.ok(b.despawnAt > b.spawnAt && b.despawnAt <= p.durationMs);
    assert.ok(b.x >= 5 && b.x <= 75);
    assert.ok(b.y >= 8 && b.y <= 63);
  }
});

test("some birds stay the whole round, some vanish early", () => {
  const p = generate({ rng: rng() });
  assert.ok(p.birds.some((b) => b.despawnAt === p.durationMs));
  assert.ok(p.birds.some((b) => b.despawnAt < p.durationMs));
});
