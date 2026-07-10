/* ---------- overlay & DOM management ------------------------------------- */

function makeOverlay(overlayClass) {
  const overlay = document.createElement("div");
  overlay.className = overlayClass;
  css(overlay, {
    position: "absolute",
    border: "4px solid #7f22fe",
    background: "rgba(127, 34, 254, 0.15)",
    pointerEvents: "none",
    zIndex: "2147483647",
    borderRadius: "6px",
    boxShadow: "0 0 0 4px rgba(127, 34, 254, 0.15), 0 4px 16px rgba(0, 0, 0, 0.2)",
  });

  const label = document.createElement("div");
  css(label, {
    position: "absolute",
    left: "0",
    top: "100%",
    transform: "translateY(4px)",
    background: "#7f22fe",
    color: "#fff",
    fontFamily: "monospace",
    fontSize: "12px",
    lineHeight: "1.2",
    padding: "3px 5px",
    whiteSpace: "nowrap",
    borderRadius: "4px",
    boxShadow: "0 1px 4px rgba(0, 0, 0, 0.1)",
  });
  overlay.appendChild(label);
  document.body.appendChild(overlay);

  return { overlay, label };
}

function updateOverlay(el, isSelected, isHighlighted, overlayClass) {
  if (!el) {
    if (hoverOverlay) hoverOverlay.style.display = "none";
    return;
  }

  if (isSelected) {
    if (overlays.some((item) => item.el === el)) return;

    const { overlay, label } = makeOverlay(overlayClass);
    overlays.push({ overlay, label, el });

    const rect = el.getBoundingClientRect();
    const borderColor = isHighlighted ? "#a855f7" : "#7f22fe";
    const backgroundColor = isHighlighted
      ? "rgba(168, 85, 247, 0.08)"
      : "rgba(127, 34, 254, 0.05)";

    css(overlay, {
      top: `${rect.top + window.scrollY}px`,
      left: `${rect.left + window.scrollX}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      display: "block",
      border: `5px solid ${borderColor}`,
      background: backgroundColor,
    });

    css(label, { display: "none" });
    return;
  }

  if (!hoverOverlay || !hoverLabel) {
    const o = makeOverlay(overlayClass);
    hoverOverlay = o.overlay;
    hoverLabel = o.label;
  }

  const rect = el.getBoundingClientRect();
  css(hoverOverlay, {
    top: `${rect.top + window.scrollY}px`,
    left: `${rect.left + window.scrollX}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    display: "block",
    border: "4px solid #7f22fe",
    background: "rgba(127, 34, 254, 0.15)",
  });
  css(hoverLabel, { background: "#7f22fe" });
  while (hoverLabel.firstChild) hoverLabel.removeChild(hoverLabel.firstChild);
  const name = getComponentNameForElement(el);
  const file = getComponentIdForElement(el).split(":")[0];
  const nameEl = document.createElement("div");
  nameEl.textContent = name;
  hoverLabel.appendChild(nameEl);
  if (file) {
    const fileEl = document.createElement("span");
    css(fileEl, { fontSize: "10px", opacity: ".8" });
    fileEl.textContent = file.replace(/\\/g, "/");
    hoverLabel.appendChild(fileEl);
  }

  requestAnimationFrame(updateAllOverlayPositions);
}

function updateAllOverlayPositions() {
  overlays.forEach(({ overlay, el }) => {
    const rect = el.getBoundingClientRect();
    css(overlay, {
      top: `${rect.top + window.scrollY}px`,
      left: `${rect.left + window.scrollX}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });
  });

  if (hoverOverlay && hoverOverlay.style.display !== "none" && state.element) {
    const rect = state.element.getBoundingClientRect();
    css(hoverOverlay, {
      top: `${rect.top + window.scrollY}px`,
      left: `${rect.left + window.scrollX}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });
  }

  if (highlightedElement) {
    const highlightedItem = overlays.find(({ el }) => el === highlightedElement);
    if (highlightedItem) {
      const rect = highlightedItem.el.getBoundingClientRect();
      window.parent.postMessage(
        {
          type: "dyad-component-coordinates-updated",
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
  }
}

function clearOverlays() {
  overlays.forEach(({ overlay }) => overlay.remove());
  overlays = [];

  if (hoverOverlay) {
    hoverOverlay.remove();
    hoverOverlay = null;
    hoverLabel = null;
  }

  currentHoveredElement = null;
  highlightedElement = null;
}

function removeOverlay(componentId, runtimeId) {
  const indicesToRemove = [];
  overlays.forEach((item, index) => {
    const itemRuntimeId = item.el?.dataset?.dyadRuntimeId || "";
    const itemComponentId = getComponentIdForElement(item.el);
    if (runtimeId ? itemRuntimeId === runtimeId : itemComponentId === componentId) {
      indicesToRemove.push(index);
    }
  });

  for (let i = indicesToRemove.length - 1; i >= 0; i--) {
    const { overlay } = overlays[indicesToRemove[i]];
    overlay.remove();
    overlays.splice(indicesToRemove[i], 1);
  }

  if (highlightedElement) {
    const highlightedRuntimeId = highlightedElement.dataset?.dyadRuntimeId || "";
    const highlightedComponentId = getComponentIdForElement(highlightedElement);
    const wasHighlighted = runtimeId
      ? highlightedRuntimeId === runtimeId
      : highlightedComponentId === componentId;
    if (wasHighlighted) highlightedElement = null;
  }
}

function removeOverlayById(componentId) {
  if (!componentId) return;
  removeOverlay(componentId);
}

function removeOverlayByRuntime(runtimeId) {
  if (!runtimeId) return;
  removeOverlay(undefined, runtimeId);
}

function getSelectedItemByElement(el) {
  return overlays.find((item) => item.el === el);
}

function shouldDeselectCurrent(el) {
  const currentRuntimeId = el?.dataset?.dyadRuntimeId || "";
  if (currentRuntimeId && highlightedElement?.dataset?.dyadRuntimeId === currentRuntimeId) {
    return true;
  }
  return highlightedElement && getComponentIdForElement(highlightedElement) === getComponentIdForElement(el);
}

function isMouseOverToolbar(mouseX, mouseY) {
  if (!componentCoordinates) return false;
  const toolbarTop = componentCoordinates.top + componentCoordinates.height + 4;
  const toolbarLeft = componentCoordinates.left;
  const toolbarHeight = 60;
  const toolbarWidth = componentCoordinates.width || 400;
  return (
    mouseY >= toolbarTop &&
    mouseY <= toolbarTop + toolbarHeight &&
    mouseX >= toolbarLeft &&
    mouseX <= toolbarLeft + toolbarWidth
  );
}

function isHighlightedComponentChildOfSelected() {
  if (!highlightedElement) return null;
  const highlightedItem = overlays.find(({ el }) => el === highlightedElement);
  if (!highlightedItem) return null;
  for (const item of overlays) {
    if (item.el === highlightedItem.el) continue;
    if (item.el.contains(highlightedItem.el)) return item;
  }
  return null;
}

function updateSelectedOverlayLabel(item, show) {
  const { label, el } = item;

  if (!show) {
    css(label, { display: "none" });
    requestAnimationFrame(updateAllOverlayPositions);
    return;
  }

  css(label, { display: "block", background: "#7f22fe" });
  while (label.firstChild) label.removeChild(label.firstChild);

  const editLine = document.createElement("div");
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("width", "12");
  svg.setAttribute("height", "12");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("fill", "none");
  Object.assign(svg.style, {
    display: "inline-block",
    verticalAlign: "-2px",
    marginRight: "4px",
  });
  const path = document.createElementNS(svgNS, "path");
  path.setAttribute(
    "d",
    "M8 0L9.48528 6.51472L16 8L9.48528 9.48528L8 16L6.51472 9.48528L0 8L6.51472 6.51472L8 0Z",
  );
  path.setAttribute("fill", "white");
  svg.appendChild(path);
  editLine.appendChild(svg);
  editLine.appendChild(document.createTextNode("Edit with AI"));
  label.appendChild(editLine);

  const name = getComponentNameForElement(el);
  const file = getComponentIdForElement(el).split(":")[0];
  const nameEl = document.createElement("div");
  nameEl.textContent = name;
  label.appendChild(nameEl);
  if (file) {
    const fileEl = document.createElement("span");
    css(fileEl, { fontSize: "10px", opacity: ".8" });
    fileEl.textContent = file.replace(/\\/g, "/");
    label.appendChild(fileEl);
  }

  requestAnimationFrame(updateAllOverlayPositions);
}
