import { createNumpad } from "../numpad.js";
import { el, clear } from "../render.js";

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

  numpad.onInput((val) => {
    if (!enabled || submitted) return;
    submitted = true;
    if (callbacks.onSubmit) callbacks.onSubmit(val);
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