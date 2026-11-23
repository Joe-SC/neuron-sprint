import { el, clear, setupCanvas } from "../render.js";

// Boxes show numbers briefly, then player taps in ascending order.
export function mountLowToHigh(container, payload, goAt, callbacks) {
  clear(container);

  const q = el("div", "question-text", "Remember the numbers!");
  container.appendChild(q);

  const wrap = el("div", "canvas-wrap");
  container.appendChild(wrap);
  const { canvas, ctx } = setupCanvas(wrap, 340, 400);

  const boxes = payload.boxes || [];
  const memoryMs = payload.memoryMs || 2000;

  // Expected tap order = indices sorted by number
  const order = boxes.map((b, i) => ({ i, n: b.number })).sort((a, b) => a.n - b.n).map(o => o.i);

  let phase = "memory"; // memory, hidden, playing
  let progress = 0;
  let mistakes = 0;
  let enabled = false;
  let done = false;
  let startTime = 0;
  let memoryTimer = null;

  function draw() {
    const w = 340;
    const h = 400;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, 0, w, h);

    const cols = Math.ceil(Math.sqrt(boxes.length));
    const cellW = w / cols;
    const cellH = h / Math.ceil(boxes.length / cols);

    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = col * cellW + 4;
      const y = row * cellH + 4;
      const bw = cellW - 8;
      const bh = cellH - 8;

      const isDone = order.indexOf(i) < progress;
      const isNext = order[progress] === i;

      ctx.fillStyle = isDone ? "#1e3a2f" : "#334155";
      ctx.fillRect(x, y, bw, bh);

      if (phase === "memory") {
        // Show the number
        ctx.fillStyle = "#f59e0b";
        ctx.font = `bold ${Math.min(bw, bh) * 0.4}px system-ui`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(b.number), x + bw / 2, y + bh / 2);
      } else if (phase === "hidden" || phase === "playing") {
        if (isDone) {
          ctx.fillStyle = "#22c55e";
          ctx.font = "20px system-ui";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("✓", x + bw / 2, y + bh / 2);
        } else if (isNext) {
          ctx.strokeStyle = "#f59e0b";
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 2, y + 2, bw - 4, bh - 4);
        }
      }
    }

    // Status
    ctx.fillStyle = "#64748b";
    ctx.font = "12px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(`${progress}/${boxes.length}  Mistakes: ${mistakes}`, w / 2, h - 6);
  }

  function handleClick(e) {
    if (!enabled || done || phase !== "playing") return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = 340 / rect.width;
    const scaleY = 400 / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    const cols = Math.ceil(Math.sqrt(boxes.length));
    const cellW = 340 / cols;
    const cellH = 400 / Math.ceil(boxes.length / cols);

    const col = Math.floor(mx / cellW);
    const row = Math.floor(my / cellH);
    const idx = row * cols + col;

    if (idx < 0 || idx >= boxes.length) return;

    if (order[progress] === idx) {
      // Correct!
      progress++;
      draw();
      if (progress >= boxes.length) {
        done = true;
        const timeMs = Math.round(performance.now() - startTime);
        if (callbacks.onComplete) callbacks.onComplete(timeMs, mistakes);
      }
    } else if (order.slice(progress).includes(idx)) {
      // Wrong order
      mistakes++;
      draw();
    }
  }

  canvas.addEventListener("click", handleClick);
  draw();

  // Countdown then memory phase
  const delay = goAt ? Math.max(0, goAt - Date.now()) : 0;

  setTimeout(() => {
    startTime = performance.now();
    phase = "memory";
    draw();
    // Show numbers for memoryMs
    memoryTimer = setTimeout(() => {
      phase = "hidden";
      draw();
      // Brief delay before playing
      setTimeout(() => {
        phase = "playing";
        enabled = true;
        draw();
      }, 500);
    }, memoryMs);
  }, delay);

  return {
    destroy() {
      if (memoryTimer) clearTimeout(memoryTimer);
      canvas.removeEventListener("click", handleClick);
      clear(container);
    },
    enable() { /* auto-enabled after memory phase */ },
    disable() { enabled = false; },
  };
}