import { createNumpad } from "../numpad.js";
import { el, clear } from "../render.js";
import { beepCorrect, beepWrong } from "../audio.js";

function normalize(input) {
  return String(input).trim().replace(/^0+(?=\d)/, "");
}

export function mountCalculations(container, payload, callbacks) {
  clear(container);

  const box = el("div", "question-box");
  const eq = el("div", "equation", `${payload.a} ${payload.op} ${payload.b} = ?`);
  box.appendChild(eq);
  container.appendChild(box);

  const numpad = createNumpad();
  numpad.mount(container);

  let enabled = false;
  let submitted = false;
  let waitingEl = null;
  const correctAnswer = String(payload.answer);

  function showLocalResult(ok) {
    const flash = document.createElement("div");
    flash.style.cssText = `position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:2rem;font-weight:800;z-index:5;pointer-events:none;transition:opacity 0.1s`;
    if (ok) {
      flash.style.background = "rgba(34,197,94,0.12)";
      flash.style.color = "#22c55e";
      flash.innerHTML = '<div>✓ Correct!</div><div style="font-size:0.9rem;font-weight:400;margin-top:8px;opacity:0.7">Waiting for opponent...</div>';
    } else {
      flash.style.background = "rgba(239,68,68,0.12)";
      flash.style.color = "#ef4444";
      flash.innerHTML = '<div>✗ Try again</div>';
    }
    container.appendChild(flash);
    setTimeout(() => {
      flash.style.opacity = "0";
      setTimeout(() => { if (flash.parentNode) flash.parentNode.removeChild(flash); }, 150);
    }, ok ? 8000 : 600); // keep "Waiting" visible for 8s (next round will clear it)
  }

  numpad.onInput((val) => {
    if (!enabled || submitted) return;

    const isCorrect = normalize(val) === correctAnswer;

    if (isCorrect) {
      submitted = true;
      beepCorrect();
      showLocalResult(true);
      if (callbacks.onSubmit) callbacks.onSubmit(val);
    } else {
      beepWrong();
      showLocalResult(false);
      numpad.clear();
    }
  });

  return {
    destroy() {
      numpad.destroy();
      clear(container);
    },
    enable() { enabled = true; numpad.clear(); },
    disable() { enabled = false; },
  };
}