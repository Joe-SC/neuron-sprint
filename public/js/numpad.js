// On-screen number pad component. Tap digits to build a value, OK to submit.
// Physical keyboard 0-9/Enter/Backspace also work.
// Uses pointerdown for instant touch feedback on mobile.

export function createNumpad() {
  let value = "";
  let onSubmit = null;

  const container = document.createElement("div");
  container.className = "numpad";

  const display = document.createElement("div");
  display.className = "display";
  display.textContent = "0";
  container.appendChild(display);

  const rows = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["bs", "0", "ok"],
  ];

  // Use pointerdown for reliable mobile touch (fires before click, no 300ms delay)
  function onPointer(btn, action) {
    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      action();
    });
  }

  for (const row of rows) {
    for (const key of row) {
      const btn = document.createElement("button");
      btn.setAttribute("type", "button");

      if (key === "bs") {
        btn.className = "backspace";
        btn.textContent = "\u232b"; // backspace symbol
        onPointer(btn, () => { value = value.slice(0, -1); updateDisplay(); });
      } else if (key === "ok") {
        btn.className = "ok";
        btn.textContent = "OK";
        onPointer(btn, () => {
          if (onSubmit) {
            // Visual feedback: flash button text to confirm press
            const orig = btn.textContent;
            btn.textContent = "\u2713";
            btn.style.background = "#16a34a";
            setTimeout(() => { btn.textContent = orig; btn.style.background = ""; }, 300);
            onSubmit(value);
          }
        });
      } else {
        btn.className = "digit";
        btn.textContent = key;
        onPointer(btn, () => { value = (value + key).slice(0, 7); updateDisplay(); });
      }
      container.appendChild(btn);
    }
  }

  function updateDisplay() {
    display.textContent = value || "0";
  }

  // Physical keyboard support
  function onKey(e) {
    if (e.key >= "0" && e.key <= "9") {
      value = (value + e.key).slice(0, 7);
      updateDisplay();
      e.preventDefault();
    } else if (e.key === "Backspace") {
      value = value.slice(0, -1);
      updateDisplay();
      e.preventDefault();
    } else if (e.key === "Enter") {
      if (onSubmit) onSubmit(value);
      e.preventDefault();
    }
  }
  document.addEventListener("keydown", onKey);

  const api = {
    mount(parent) { parent.appendChild(container); },
    destroy() {
      document.removeEventListener("keydown", onKey);
      if (container.parentNode) container.parentNode.removeChild(container);
    },
    clear() { value = ""; updateDisplay(); },
    onInput(cb) { onSubmit = cb; },
    getValue() { return value; },
    setValue(v) { value = String(v); updateDisplay(); },
  };

  return api;
}