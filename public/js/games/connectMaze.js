import { el, clear, setupCanvas } from "../render.js";

// Tap circles in sequence A-1-B-2-...-M-13. Wrong taps = mistakes (recorded).
export function mountConnectMaze(container, payload, goAt, callbacks) {
  clear(container);

  const q = el("div", "question-text", "Tap A - 1 - B - 2 ... M - 13");
  container.appendChild(q);

  const wrap = el("div", "canvas-wrap");
  container.appendChild(wrap);
  const { canvas, ctx } = setupCanvas(wrap, 340, 400);

  const circles = payload.circles || [];
  const SEQUENCE = [];
  for (let i = 0; i < 13; i++) SEQUENCE.push(String.fromCharCode(65 + i), String(i + 1));

  let progress = 0;
  let mistakes = 0;
  let enabled = false;
  let done = false;
  let startTime = 0;

  function draw(highlightIdx) {
    const w = 340;
    const h = 400;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, 0, w, h);

    const targetLabel = progress < SEQUENCE.length ? SEQUENCE[progress] : null;

    for (let i = 0; i < circles.length; i++) {
      const c = circles[i];
      const pctX = c.x / 100;
      const pctY = c.y / 100;
      const x = pctX * w;
      const y = pctY * h;
      const r = 18;

      // Circle background
      const isTarget = c.label === targetLabel;
      const isDone = SEQUENCE.indexOf(c.label) < progress;

      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = isDone ? "#1e3a2f" : isTarget ? "#f59e0b" : "#334155";
      ctx.fill();
      if (isTarget) {
        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Label
      ctx.fillStyle = isDone ? "#22c55e" : isTarget ? "#0f172a" : "#94a3b8";
      ctx.font = "bold 13px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(c.label, x, y);
    }

    // Progress indicator
    ctx.fillStyle = "#64748b";
    ctx.font = "12px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(`${progress}/${SEQUENCE.length}  Mistakes: ${mistakes}`, w / 2, h - 10);
  }

  function handleClick(e) {
    if (!enabled || done) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = 340 / rect.width;
    const scaleY = 400 / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    if (progress >= SEQUENCE.length) return;

    const targetLabel = SEQUENCE[progress];
    const target = circles.find(c => c.label === targetLabel);

    // Find nearest circle within hit radius
    let hit = null;
    let hitDist = 30;
    for (const c of circles) {
      const cx = (c.x / 100) * 340;
      const cy = (c.y / 100) * 400;
      const d = Math.sqrt((mx - cx) ** 2 + (my - cy) ** 2);
      if (d < hitDist) { hitDist = d; hit = c; }
    }

    if (!hit) return;

    if (hit.label === targetLabel) {
      // Correct!
      progress++;
      draw();
      if (progress >= SEQUENCE.length) {
        done = true;
        const timeMs = Math.round(performance.now() - startTime);
        if (callbacks.onComplete) callbacks.onComplete(timeMs, mistakes);
      }
    } else if (SEQUENCE.slice(progress).includes(hit.label)) {
      // They hit a future target — wrong order
      mistakes++;
      draw();
    }
    // Tapping irrelevant circles = no penalty
  }

  canvas.addEventListener("click", handleClick);

  draw();
  if (goAt) {
    const delay = goAt - Date.now();
    if (delay > 0) {
      setTimeout(() => { startTime = performance.now(); enabled = true; }, delay);
    } else {
      startTime = performance.now();
      enabled = true;
    }
  } else {
    startTime = performance.now();
    enabled = true;
  }

  return {
    destroy() {
      canvas.removeEventListener("click", handleClick);
      clear(container);
    },
    enable() { if (!startTime) startTime = performance.now(); enabled = true; draw(); },
    disable() { enabled = false; },
  };
}