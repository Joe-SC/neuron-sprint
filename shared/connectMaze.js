// Connect Maze: 26 circles (letters A..M and numbers 1..13) scattered across
// the board. Tap them in the sequence A, 1, B, 2, C, 3, ... M, 13 as fast as
// possible. Wrong taps cost time (mistakes), they do not advance the sequence.

export function SEQUENCE() {
  // A,1,B,2,...,M,13
  const seq = [];
  for (let i = 0; i < 13; i++) {
    seq.push(String.fromCharCode(65 + i)); // A..M
    seq.push(String(i + 1));
  }
  return seq;
}

export function generate({ rng = Math.random, minSeparation = 14 } = {}) {
  const labels = SEQUENCE();
  // positions in percent of the play area, padding 12..88
  const circles = [];
  for (const label of labels) {
    let x = 0;
    let y = 0;
    let tries = 0;
    do {
      x = Math.floor(rng() * 76) + 12;
      y = Math.floor(rng() * 76) + 12;
      tries++;
    } while (
      tries < 80 &&
      circles.some((c) => (c.x - x) ** 2 + (c.y - y) ** 2 < minSeparation ** 2)
    );
    circles.push({ label, x, y });
  }
  return { kind: "connectMaze", circles };
}

// progress: how many correct taps so far. Returns the label that should be
// tapped next, or null when the maze is complete.
export function nextTarget(progress = 0) {
  const seq = SEQUENCE();
  return progress >= seq.length ? null : seq[progress];
}
