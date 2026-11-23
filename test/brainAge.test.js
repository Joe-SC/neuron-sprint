import { test } from "node:test";
import assert from "node:assert/strict";
import { ANCHORS, brainAge, exercisePoorness, speedMetaphor } from "../shared/brainAge.js";

test("perfect fast run scores a young brain age", () => {
  const ages = [];
  for (const kind of Object.keys(ANCHORS)) {
    const p = exercisePoorness(kind, { avgMs: ANCHORS[kind].fastMs, accuracy: 1 });
    ages.push(p);
  }
  assert.ok(brainAge(ages) <= 30, `got ${brainAge(ages)}`);
});

test("slow sloppy run scores an old brain age", () => {
  const ages = [];
  for (const kind of Object.keys(ANCHORS)) {
    const p = exercisePoorness(kind, { avgMs: ANCHORS[kind].slowMs, accuracy: 0.5, mistakes: 6 });
    ages.push(p);
  }
  assert.ok(brainAge(ages) >= 60, `got ${brainAge(ages)}`);
});

test("brain age is bounded 20..80", () => {
  assert.equal(brainAge([0, 0, 0]), 20);
  assert.equal(brainAge([1, 1, 1]), 80);
  assert.equal(brainAge([]), 20);
});

test("monotonic: better stats never yield a worse age", () => {
  const good = [0.1, 0.2, 0.3];
  const bad = [0.6, 0.7, 0.8];
  assert.ok(brainAge(good) <= brainAge(bad));
  assert.ok(brainAge([0.1, 0.1, 0.1]) <= brainAge([0.9, 0.1, 0.1]));
});

test("poorness clamps to [0,1]", () => {
  assert.equal(exercisePoorness("calculations", { avgMs: 50, accuracy: 1 }), 0);
  assert.equal(exercisePoorness("calculations", { avgMs: 99999, accuracy: 0 }), 1);
});

test("speed metaphors bucket correctly", () => {
  assert.equal(speedMetaphor(0.1), "rocket speed");
  assert.equal(speedMetaphor(0.3), "jet speed");
  assert.equal(speedMetaphor(0.6), "car speed");
  assert.equal(speedMetaphor(0.9), "bicycle speed");
});

test("unknown exercise throws", () => {
  assert.throws(() => exercisePoorness("nope", { avgMs: 1000 }), /unknown exercise/);
});
