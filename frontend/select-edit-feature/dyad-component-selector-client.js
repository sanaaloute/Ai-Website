/* ---------- shared state ------------------------------------------------ */
const OVERLAY_CLASS = "__dyad_overlay__";
let overlays = [];
let hoverOverlay = null;
let hoverLabel = null;
let currentHoveredElement = null;
let highlightedElement = null;
let componentCoordinates = null;
const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
let state = { type: "inactive" };

/* ---------- message bridge -------------------------------------------- */
window.addEventListener("message", (e) => {
  if (e.source !== window.parent) return;
  if (e.data.type === "activate-dyad-component-selector") activate();
  if (e.data.type === "deactivate-dyad-component-selector") deactivate();
  if (e.data.type === "activate-dyad-visual-editing") activate();
  if (e.data.type === "deactivate-dyad-visual-editing") {
    deactivate();
    clearOverlays();
  }
  if (e.data.type === "clear-dyad-component-overlays") clearOverlays();
  if (e.data.type === "update-dyad-overlay-positions") updateAllOverlayPositions();
  if (e.data.type === "update-component-coordinates") {
    componentCoordinates = e.data.coordinates;
  }
  if (
    e.data.type === "remove-dyad-component-overlay" ||
    e.data.type === "deselect-dyad-component"
  ) {
    if (e.data.runtimeId) {
      removeOverlayByRuntime(e.data.runtimeId);
    } else if (e.data.componentId) {
      removeOverlayById(e.data.componentId);
    }
  }
});

/* ---------- global event listeners ------------------------------------ */
window.addEventListener("keydown", onKeyDown, true);
window.addEventListener("mousemove", onMouseMove, true);
document.addEventListener("mouseleave", onMouseLeave, true);
window.addEventListener("resize", updateAllOverlayPositions);
window.addEventListener("scroll", updateAllOverlayPositions, true);

/* ---------- initialization -------------------------------------------- */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeComponentSelector);
} else {
  initializeComponentSelector();
}
