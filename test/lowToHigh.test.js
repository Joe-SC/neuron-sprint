import { test } from "node:test";
import assert from "node:assert/strict";
import { generate, expectedOrder, gridFor } from "../shared/lowToHigh.js";

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

test("generates distinct numbers with grid positions", () => {
  const p = generate({ count: 4, rng: rng() });
  assert.equal(p.boxes.length, 4);
  const numbers = new Set(p.boxes.map((b) => b.number));
  assert.equal(numbers.size, 4, "numbers are distinct");
  for (const b of p.boxes) {
    assert.ok(b.x > 0 && b.x < 100 && b.y > 0 && b.y < 100);
  }
});

test("gridFor returns positions for every box", () => {
  for (const count of [1, 4, 5, 6, 9, 12, 16]) {
    const positions = gridFor(count);
    assert.ok(positions.length >= count, `count ${count}`);
  }
});

test("expectedOrder sorts boxes ascending by number", () => {
  const boxes = [
    { number: 50, x: 0, y: 0 },
    { number: 10, x: 0, y: 0 },
    { number: 99, x: 0, y: 0 },
    { number: 4, x: 0, y: 0 },
  ];
  const order = expectedOrder(boxes);
  assert.deepEqual(order, [3, 1, 0, 2]); // 4, 10, 50, 99
});
