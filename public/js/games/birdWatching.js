import { createNumpad } from "../numpad.js";
import { el, clear, setupCanvas } from "../render.js";

export function mountBirdWatching(container, payload, goAt, callbacks) {
  clear(container);

  const q = el("div", "question-text", "Count the birds!");
  container.appendChild(q);

  const wrap = el("div", "canvas-wrap");
  container.appendChild(wrap);
  const { canvas, ctx } = setupCanvas(wrap, 340, 400);

  const numpad = createNumpad();
  numpad.mount(container);

  let enabled = false;
  let submitted = false;
  let animId = null;
  let elapsed = 0;
  const startTime = performance.now();

  function draw(time) {
    elapsed = time - startTime;

    if (elapsed >= payload.durationMs + 500) {
      // Animation done — enable input
      if (!enabled) {
        enabled = true;
        numpad.clear();
      }
      drawStatic();
      return;
    }

    const w = 340;
    const h = 400;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, 0, w, h);

    // Draw sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#0f172a");
    grad.addColorStop(1, "#1e3a5f");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const birds = payload.birds || [];
    for (const b of birds) {
      if (elapsed >= b.spawnAt && elapsed < b.despawnAt) {
        const pctX = b.x / 100;
        const pctY = b.y / 100;
        let x = pctX * w;
        let y = pctY * h + Math.sin(elapsed / 200 + b.id) * 3;
        const sz = b.size || 14;

        // Draw simple bird
        ctx.fillStyle = "#94a3b8";
        ctx.beginPath();
        ctx.ellipse(x, y, sz, sz * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        // Wing
        ctx.fillStyle = "#64748b";
        ctx.beginPath();
        ctx.ellipse(x - 2, y - 3, sz * 0.4, sz * 0.3, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + 2, y - 3, sz * 0.4, sz * 0.3, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (!submitted) animId = requestAnimationFrame(draw);
  }

  function drawStatic() {
    const w = 340;
    const h = 400;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "16px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("How many birds did you see?", w/2, h/2 - 10);
  }

  animId = requestAnimationFrame(draw);

  numpad.onInput((val) => {
    if (!enabled || submitted) return;
    submitted = true;
    if (callbacks.onSubmit) callbacks.onSubmit(val);
  });

  return {
    destroy() {
      if (animId) cancelAnimationFrame(animId);
      numpad.destroy();
      clear(container);
    },
    enable() { /* don't enable until animation finishes */ },
    disable() { enabled = false; },
  };
}