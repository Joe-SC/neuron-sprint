import { el, clear } from "../render.js";

// Color display names mapped to CSS
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

  // Color tiles
  const tilesDiv = el("div", "stroop-tiles");
  let enabled = false;

  payload.choices.forEach(color => {
    const btn = el("button", "stroop-tile", color);
    btn.style.background = COLOR_BG[color] || "#1e293b";
    btn.style.color = COLOR_CSS[color] || "#fff";
    btn.addEventListener("click", () => {
      if (!enabled) return;
      if (callbacks.onSubmit) callbacks.onSubmit(color);
      enabled = false;
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