import { el, clear } from "../render.js";
import { beepCorrect, beepWrong } from "../audio.js";

const COLOR_CSS = {
  blue: "#3b82f6",
  black: "#1e293b",
  yellow: "#eab308",
  red: "#ef4444",
};

const COLOR_BG = {
  blue: "#1e3a5f",
  black: "#334155",
  yellow: "#422006",
  red: "#450a0a",
};

export function mountStroop(container, payload, callbacks) {
  clear(container);

  const box = el("div", "question-box");
  const wordEl = el("div", "equation");
  wordEl.textContent = payload.word;
  wordEl.style.color = COLOR_CSS[payload.ink] || "#fff";
  box.appendChild(wordEl);
  container.appendChild(box);

  const tilesDiv = el("div", "stroop-tiles");
  let enabled = false;
  let submitted = false;

  // Local result flash
  function showFlash(ok) {
    const flash = document.createElement("div");
    flash.className = "result-flash show";
    flash.style.cssText = `position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:2rem;font-weight:800;z-index:5;pointer-events:none`;
    if (ok) {
      flash.style.background = "rgba(34,197,94,0.12)";
      flash.style.color = "#22c55e";
      flash.textContent = "✓ Correct!";
    } else {
      flash.style.background = "rgba(239,68,68,0.12)";
      flash.style.color = "#ef4444";
      flash.textContent = "✗ Wrong";
    }
    container.appendChild(flash);
    setTimeout(() => {
      flash.style.opacity = "0";
      setTimeout(() => { if (flash.parentNode) flash.parentNode.removeChild(flash); }, 150);
    }, ok ? 400 : 500);
  }

  payload.choices.forEach(color => {
    const btn = el("button", "stroop-tile", color);
    btn.style.background = COLOR_BG[color] || "#1e293b";
    btn.style.color = COLOR_CSS[color] || "#fff";
    btn.style.touchAction = "manipulation";
    btn.addEventListener("click", () => {
      if (!enabled || submitted) return;
      const correct = color === payload.ink;
      if (correct) {
        submitted = true;
        beepCorrect();
        showFlash(true);
        if (callbacks.onSubmit) callbacks.onSubmit(color);
      } else {
        beepWrong();
        showFlash(false);
      }
    });
    tilesDiv.appendChild(btn);
  });

  container.appendChild(tilesDiv);

  return {
    destroy() { clear(container); },
    enable() { enabled = true; },
    disable() { enabled = false; },
  };
}