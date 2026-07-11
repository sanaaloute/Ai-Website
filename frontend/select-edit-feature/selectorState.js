/* ---------- activation / deactivation --------------------------------- */

function activate() {
  if (state.type === "inactive") {
    window.addEventListener("click", onClick, true);
  }
  state = { type: "inspecting", element: null };
}

function deactivate() {
  if (state.type === "inactive") return;
  window.removeEventListener("click", onClick, true);
  if (hoverOverlay) hoverOverlay.style.display = "none";
  overlays.forEach((item) => updateSelectedOverlayLabel(item, false));
  currentHoveredElement = null;
  state = { type: "inactive" };
}

function initializeComponentSelector() {
  if (!document.body) {
    console.error("Dyad component selector initialization failed: document.body not found.");
    return;
  }

  const INIT_TIMEOUT_MS = 60_000;
  let observer = null;
  let timeoutId = null;

  function checkForTaggedElements() {
    if (document.body.querySelector("[data-dyad-id]")) {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      window.parent.postMessage({ type: "dyad-component-selector-initialized" }, "*");
      console.debug("Dyad component selector initialized");
      return true;
    }
    return false;
  }

  setTimeout(() => {
    if (checkForTaggedElements()) return;

    console.debug("Dyad component selector waiting for tagged elements to appear...");

    observer = new MutationObserver((mutations) => {
      const hasRelevantMutation = mutations.some((mutation) => {
        if (mutation.type === "attributes") return true;
        if (mutation.type === "childList") {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (
                node.hasAttribute("data-dyad-id") ||
                node.querySelector("[data-dyad-id]")
              ) {
                return true;
              }
            }
          }
        }
        return false;
      });

      if (hasRelevantMutation) checkForTaggedElements();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-dyad-id"],
    });

    timeoutId = setTimeout(() => {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      if (!document.body.querySelector("[data-dyad-id]")) {
        console.warn("Dyad component selector not initialized because no DOM elements were tagged");
      }
    }, INIT_TIMEOUT_MS);
  }, 0);
}
