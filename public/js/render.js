// DOM helpers and reusable UI components.

export function el(tag, className, innerHTML) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (innerHTML != null) e.innerHTML = innerHTML;
  return e;
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

// ── Countdown overlay ──
// Shows 3…2…1…GO then calls start() when GO appears.
export function mountCountdown(container, onGo) {
  const overlay = el("div", "countdown-overlay visible");
  container.appendChild(overlay);

  const steps = ["3", "2", "1", "GO"];
  let i = 0;
  const interval = setInterval(() => {
    if (i >= steps.length) {
      clearInterval(interval);
      overlay.classList.remove("visible");
      container.removeChild(overlay);
      if (onGo) onGo();
      return;
    }
    overlay.innerHTML = `<span>${steps[i]}<span class="sub">${i < 3 ? "get ready" : ""}</span></span>`;
    i++;
  }, 800);

  return () => { clearInterval(interval); if (overlay.parentNode) container.removeChild(overlay); };
}

// ── Scoreboard ──
export function mountScoreboard(container, players) {
  const sb = el("div", "scoreboard");
  players.forEach(p => {
    sb.appendChild(el("div", "score-item", `<div class="name">${esc(p.name)}</div><div class="points">${p.points}</div>`));
  });
  container.appendChild(sb);
  return sb;
}

export function updateScoreboard(sb, scores) {
  const items = sb.querySelectorAll(".score-item");
  scores.forEach((s, i) => {
    if (items[i]) {
      items[i].querySelector(".points").textContent = s.points;
    }
  });
}

export function roundProgress(container, roundIndex, total) {
  const p = el("div", "round-progress", `Round ${roundIndex + 1} of ${total}`);
  container.appendChild(p);
  return p;
}

// ── Result flash overlay ──
export function showFlash(container, type, message, detail = "", duration = 1200) {
  const f = el("div", `result-flash show ${type}`, `<div>${esc(message)}${detail ? `<div class="detail">${esc(detail)}</div>` : ""}</div>`);
  container.appendChild(f);
  setTimeout(() => { f.classList.remove("show"); setTimeout(() => { if (f.parentNode) f.parentNode.removeChild(f); }, 300); }, duration);
}

// ── Toast ──
export function showToast(msg) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = el("div", "toast");
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(toast._hide);
  toast._hide = setTimeout(() => toast.classList.remove("show"), 3000);
}

function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" })[c]); }

// ── Canvas helpers ──
export function setupCanvas(wrap, width = 300, height = 400) {
  const canvas = el("canvas");
  canvas.width = width;
  canvas.height = height;
  wrap.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  return { canvas, ctx };
}

export function dprScale(ctx, width, height) {
  const dpr = window.devicePixelRatio || 1;
  ctx.canvas.width = width * dpr;
  ctx.canvas.height = height * dpr;
  ctx.canvas.style.width = width + "px";
  ctx.canvas.style.height = height + "px";
  ctx.scale(dpr, dpr);
}