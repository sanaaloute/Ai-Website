/* eslint-disable @typescript-eslint/no-unused-vars -- concatenated into one bundle; symbols are used across files (see scripts/build-editor-bridge.js) */
/* ---------- DOM helpers --------------------------------------------------- */

const css = (el, obj) => Object.assign(el.style, obj);

function getComponentSourceElement(el) {
  if (!el) return null;
  if (el.dataset && el.dataset.dyadId) return el;
  if (typeof el.closest === "function") {
    return el.closest("[data-dyad-id]");
  }
  return null;
}

function getComponentIdForElement(el) {
  return getComponentSourceElement(el)?.dataset?.dyadId || "";
}

function getComponentNameForElement(el) {
  const own = el?.dataset?.dyadName;
  if (own) return own;
  const source = getComponentSourceElement(el);
  if (el && source && el !== source) {
    const aria = el.getAttribute?.("aria-label");
    if (aria && aria.trim()) return aria.trim();
    const title = el.getAttribute?.("title");
    if (title && title.trim()) return title.trim();
    const text = (el.innerText || el.textContent || "").trim().replace(/\s+/g, " ");
    if (text) {
      const tag = (el.tagName || "element").toLowerCase();
      return `${tag}: ${text.slice(0, 64)}`;
    }
  }
  if (source?.dataset?.dyadName) return source.dataset.dyadName;
  if (!el) return "<unknown>";
  const tag = (el.tagName || "element").toLowerCase();
  const text = (el.innerText || "").trim().replace(/\s+/g, " ");
  if (text) return `${tag}: ${text.slice(0, 48)}`;
  return tag;
}

function ensureRuntimeId(el) {
  if (!el.dataset.dyadRuntimeId) {
    el.dataset.dyadRuntimeId = `dyad-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  return el.dataset.dyadRuntimeId;
}

/**
 * Resolve most specific selectable node for hover/click:
 * - Prefer the topmost leaf element under cursor
 * - but always require that it belongs to a dyad-tagged ancestor subtree.
 */
function resolveSelectableElementAtPoint(clientX, clientY, overlayClass) {
  let stack;
  try {
    stack = document.elementsFromPoint(clientX, clientY);
  } catch {
    return null;
  }
  if (!stack || !stack.length) return null;

  for (let i = 0; i < stack.length; i++) {
    const node = stack[i];
    if (!node || node.nodeType !== Node.ELEMENT_NODE) continue;
    if (node.classList && node.classList.contains(overlayClass)) continue;
    if (node === document.body || node === document.documentElement) continue;
    if (getComponentSourceElement(node)) return node;
  }
  return null;
}
