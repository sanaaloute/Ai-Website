/* eslint-disable @typescript-eslint/no-unused-vars -- concatenated into one bundle; symbols are used across files (see scripts/build-editor-bridge.js) */
/* ---------- event handlers -------------------------------------------- */

function onMouseMove(e) {
  if (isMouseOverToolbar(e.clientX, e.clientY)) {
    if (currentHoveredElement) {
      const previousItem = overlays.find((item) => item.el === currentHoveredElement);
      if (previousItem) updateSelectedOverlayLabel(previousItem, false);
      currentHoveredElement = null;
    }
    return;
  }

  const el = resolveSelectableElementAtPoint(e.clientX, e.clientY, OVERLAY_CLASS);
  const hoveredItem = getSelectedItemByElement(el);
  const parentOfHighlighted = isHighlightedComponentChildOfSelected();

  if (hoveredItem && hoveredItem.el === highlightedElement && parentOfHighlighted) {
    updateSelectedOverlayLabel(parentOfHighlighted, false);
    if (currentHoveredElement === parentOfHighlighted.el) currentHoveredElement = null;
  }

  if (currentHoveredElement && currentHoveredElement !== el) {
    const previousItem = overlays.find((item) => item.el === currentHoveredElement);
    if (previousItem) updateSelectedOverlayLabel(previousItem, false);
  }

  currentHoveredElement = el;

  if (hoveredItem && hoveredItem.el !== highlightedElement) {
    updateSelectedOverlayLabel(hoveredItem, true);
    if (hoverOverlay) hoverOverlay.style.display = "none";
  }

  if (state.type === "inspecting") {
    if (state.element === el) return;
    state.element = el;
    if (!hoveredItem && el) {
      updateOverlay(el, false, false, OVERLAY_CLASS);
    } else if (!el) {
      if (hoverOverlay) hoverOverlay.style.display = "none";
    }
  }
}

function onMouseLeave(e) {
  if (!e.relatedTarget) {
    if (hoverOverlay) {
      hoverOverlay.style.display = "none";
      requestAnimationFrame(updateAllOverlayPositions);
    }
    currentHoveredElement = null;
    if (state.type === "inspecting") state.element = null;
  }
}

function onClick(e) {
  if (state.type !== "inspecting") return;
  e.preventDefault();
  e.stopPropagation();

  const elAtPoint = resolveSelectableElementAtPoint(e.clientX, e.clientY, OVERLAY_CLASS);
  if (!elAtPoint) return;
  state.element = elAtPoint;

  const clickedComponentId = getComponentIdForElement(state.element);
  if (!clickedComponentId) return;
  const clickedRuntimeId = ensureRuntimeId(state.element);
  const selectedItem = getSelectedItemByElement(state.element);

  if (e.detail === 2 && clickedComponentId && state.element) {
    window.parent.postMessage(
      {
        type: "ai-website-request-inline-text-edit",
        componentId: clickedComponentId,
        runtimeId: clickedRuntimeId,
      },
      "*",
    );
    return;
  }

  if (highlightedElement && highlightedElement !== state.element) {
    const prevEl = highlightedElement;
    const prevId = getComponentIdForElement(prevEl);
    const prevRid = prevEl?.dataset?.dyadRuntimeId;
    window.parent.postMessage(
      { type: "dyad-component-deselected", componentId: prevId, runtimeId: prevRid },
      "*",
    );
    removeOverlay(prevId, prevRid);
    requestAnimationFrame(updateAllOverlayPositions);
  }

  if (selectedItem && shouldDeselectCurrent(state.element)) {
    if (state.element.contentEditable === "true") return;
    removeOverlay(clickedComponentId, clickedRuntimeId);
    requestAnimationFrame(updateAllOverlayPositions);
    highlightedElement = null;
    window.parent.postMessage(
      { type: "dyad-component-deselected", componentId: clickedComponentId, runtimeId: clickedRuntimeId },
      "*",
    );
    return;
  }

  if (highlightedElement && highlightedElement !== state.element) {
    const previousItem = overlays.find((item) => item.el === highlightedElement);
    if (previousItem) {
      css(previousItem.overlay, {
        border: `5px solid #7f22fe`,
        background: "rgba(127, 34, 254, 0.15)",
      });
    }
  }

  highlightedElement = state.element;

  if (selectedItem) {
    css(selectedItem.overlay, {
      border: `5px solid #a855f7`,
      background: "rgba(168, 85, 247, 0.18)",
    });
  }

  if (!selectedItem) {
    updateOverlay(state.element, true, true, OVERLAY_CLASS);
    requestAnimationFrame(updateAllOverlayPositions);
  }

  const rect = state.element.getBoundingClientRect();
  window.parent.postMessage(
    {
      type: "dyad-component-selected",
      component: {
        id: clickedComponentId,
        name: getComponentNameForElement(state.element),
        runtimeId: clickedRuntimeId,
      },
      coordinates: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      },
    },
    "*",
  );
}

function onKeyDown(e) {
  if (
    e.target.tagName === "INPUT" ||
    e.target.tagName === "TEXTAREA" ||
    e.target.isContentEditable
  ) {
    return;
  }

  const key = e.key.toLowerCase();
  const hasShift = e.shiftKey;
  const hasCtrlOrMeta = isMac ? e.metaKey : e.ctrlKey;
  if (key === "c" && hasShift && hasCtrlOrMeta) {
    e.preventDefault();
    window.parent.postMessage({ type: "dyad-select-component-shortcut" }, "*");
  }
}
