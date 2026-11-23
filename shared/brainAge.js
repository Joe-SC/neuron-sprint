// Brain age — OUR approximation, inspired by the classic hand-held training
// games. The formula here is original and documented; it is not Nintendo's
// proprietary scoring. Not medical advice, it's a party game.
//
// Each exercise produces a "poorness" in [0, 1] (0 = brilliant, 1 = rusty)
// from how slow and how inaccurate the player was. The overall brain age is
// 20 + 60 * mean(poorness), clamped to [20, 80].

export const ANCHORS = {
  calculations: { fastMs: 900, slowMs: 5000 },
  stroop: { fastMs: 700, slowMs: 4000 },
  numberCruncher: { fastMs: 2600, slowMs: 10000 },
  connectMaze: { fastMs: 20000, slowMs: 90000 },
  lowToHigh: { fastMs: 12000, slowMs: 45000 },
  birdWatching: { fastMs: 6000, slowMs: 20000 },
};

// kind: exercise id. stats: { avgMs, accuracy (0..1, default 1), mistakes }
export function exercisePoorness(kind, { avgMs, accuracy = 1, mistakes = 0 } = {}) {
  const anchor = ANCHORS[kind];
  if (!anchor) throw new Error(`unknown exercise: ${kind}`);
  const timePoor = Math.max(0, Math.min(1, (avgMs - anchor.fastMs) / (anchor.slowMs - anchor.fastMs)));
  const accPoor = 1 - accuracy;
  let p = 0.6 * timePoor + 0.4 * accPoor;
  if (mistakes > 0) p += Math.min(0.2, mistakes * 0.04);
  return Math.max(0, Math.min(1, p));
}

export function brainAge(poornesses) {
  if (poornesses.length === 0) return 20;
  const avg = poornesses.reduce((s, p) => s + p, 0) / poornesses.length;
  return Math.max(20, Math.min(80, Math.round(20 + 60 * avg)));
}

// Speed flavour text, mirrors the spirit of the originals.
export function speedMetaphor(avgNormTime) {
  if (avgNormTime < 0.2) return "rocket speed";
  if (avgNormTime < 0.45) return "jet speed";
  if (avgNormTime < 0.7) return "car speed";
  return "bicycle speed";
}
