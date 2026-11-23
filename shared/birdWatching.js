// Bird Watching: birds appear on screen, some only briefly. Count how many
// distinct birds you saw in total.

export function generate({ rng = Math.random } = {}) {
  const total = 3 + Math.floor(rng() * 13); // 3..15 birds
  const durationMs = 3000 + total * 180; // longer rounds for more birds
  const birds = [];
  for (let i = 0; i < total; i++) {
    const staysWholeRound = rng() < 0.55;
    const spawnAt = Math.floor(rng() * durationMs * 0.5);
    const despawnAt = staysWholeRound
      ? durationMs
      : spawnAt + 500 + Math.floor(rng() * 1400);
    birds.push({
      id: i,
      spawnAt,
      despawnAt: Math.min(despawnAt, durationMs),
      x: Math.floor(rng() * 70) + 5, // percent
      y: Math.floor(rng() * 55) + 8,
      size: 12 + Math.floor(rng() * 6),
      flap: Math.floor(rng() * 3),
    });
  }
  return { kind: "birdWatching", birds, durationMs, answer: total };
}

export function isCorrect(payload, input) {
  return String(input).trim().replace(/^0+(?=\d)/, "") === String(payload.answer);
}
