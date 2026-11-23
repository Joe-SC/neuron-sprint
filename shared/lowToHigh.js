// Low to High: a grid of boxes shows numbers for a short time. When they hide,
// tap the boxes in ascending numeric order, fastest with fewest mistakes wins.

const GRID = {
  4: [[25, 25], [75, 25], [25, 75], [75, 75]], // 2x2
  6: [[16, 16], [50, 16], [83, 16], [16, 83], [50, 83], [83, 83]], // 3x2
  9: [[16, 16], [50, 16], [83, 16], [16, 50], [50, 50], [83, 50], [16, 83], [50, 83], [83, 83]], // 3x3
  12: [[12, 12], [37, 12], [62, 12], [87, 12], [12, 37], [37, 37], [62, 37], [87, 37], [12, 62], [37, 62], [62, 62], [87, 62]], // 4x3
  16: [[12, 12], [37, 12], [62, 12], [87, 12], [12, 37], [37, 37], [62, 37], [87, 37], [12, 62], [37, 62], [62, 62], [87, 62], [12, 87], [37, 87], [62, 87], [87, 87]], // 4x4
};

export function gridFor(count) {
  const sizes = Object.keys(GRID)
    .map(Number)
    .sort((a, b) => a - b);
  const size = sizes.find((s) => s >= count) ?? sizes[sizes.length - 1];
  return GRID[size];
}

export function generate({ count = 4, max = 99, rng = Math.random } = {}) {
  const positions = gridFor(count);
  const used = new Set();
  const boxes = [];
  while (boxes.length < positions.length) {
    const number = 1 + Math.floor(rng() * max);
    if (used.has(number)) continue;
    used.add(number);
    boxes.push({ number, x: positions[boxes.length][0], y: positions[boxes.length][1] });
  }
  return { kind: "lowToHigh", boxes, memoryMs: 2000 };
}

// The expected tap order = indices of boxes sorted by number ascending.
export function expectedOrder(boxes) {
  return boxes
    .map((b, i) => ({ i, n: b.number }))
    .sort((a, b) => a.n - b.n)
    .map((o) => o.i);
}
