import { createNumpad } from "../numpad.js";
import { el, clear, setupCanvas, dprScale } from "../render.js";

export function mountNumberCruncher(container, payload, goAt, callbacks) {
  clear(container);

  // Question
  const q = el("div", "question-text", payload.question);
  container.appendChild(q);

  // Canvas
  const wrap = el("div", "canvas-wrap");
  container.appendChild(wrap);
  const { canvas, ctx } = setupCanvas(wrap, 340, 340);

  // Numpad
  const numpad = createNumpad();
  numpad.mount(container);

  let enabled = false;
  let submitted = false;
  let animId = null;

  function draw(time) {
    const w = 340;
    const h = 340;
    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, 0, w, h);

    const numbers = payload.numbers || [];
    for (const n of numbers) {
      const pctX = n.x / 100;
      const pctY = n.y / 100;
      let x = pctX * w;
      let y = pctY * h;

      if (n.moving) {
        x += (Math.sin(time / 1000 * (n.dx || 0.3)) * 20);
        y += (Math.cos(time / 1000 * (n.dy || 0.3)) * 20);
      }

      ctx.fillStyle = n.color === "blue" ? "#3b82f6" : n.color === "red" ? "#ef4444" : "#f1f5f9";
      ctx.font = `${n.size || 32}px system-ui, sans-serif`;
      ctx.fontWeight = "700";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(n.value), x, y);
    }

    if (!submitted) animId = requestAnimationFrame(draw);
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
    enable() { enabled = true; numpad.clear(); },
    disable() { enabled = false; },
  };
}