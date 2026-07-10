(() => {
  /* ---------- helpers --------------------------------------------------- */

  // Track text editing state globally
  let textEditingState = new Map(); // componentId -> { originalText, currentText, cleanup }

  function findElementByDyadId(dyadId, runtimeId) {
    // If runtimeId is provided, try to find element by runtime ID first
    if (runtimeId) {
      const elementByRuntimeId = document.querySelector(
        `[data-dyad-runtime-id="${runtimeId}"]`,
      );
      if (elementByRuntimeId) {
        return elementByRuntimeId;
      }
    }

    // Fall back to finding by dyad-id (will get first match)
    const escaped = CSS.escape(dyadId);
    return document.querySelector(`[data-dyad-id="${escaped}"]`);
  }

  function applyStyles(element, styles) {
    if (!element || !styles) return;

    console.debug(
      `[Dyad Visual Editor] Applying styles:`,
      styles,
      "to element:",
      element,
    );

    const applySpacing = (type, values) => {
      if (!values) return;
      Object.entries(values).forEach(([side, value]) => {
        const cssProperty = `${type}${side.charAt(0).toUpperCase() + side.slice(1)}`;
        element.style[cssProperty] = value;
      });
    };

    applySpacing("margin", styles.margin);
    applySpacing("padding", styles.padding);

    if (styles.border) {
      if (styles.border.width !== undefined) {
        element.style.borderWidth = styles.border.width;
        element.style.borderStyle = "solid";
      }
      if (styles.border.radius !== undefined) {
        element.style.borderRadius = styles.border.radius;
      }
      if (styles.border.color !== undefined) {
        element.style.borderColor = styles.border.color;
      }
    }

    if (styles.backgroundColor !== undefined) {
      element.style.backgroundColor = styles.backgroundColor;
    }

    if (styles.text) {
      const textProps = {
        fontSize: "fontSize",
        fontWeight: "fontWeight",
        fontFamily: "fontFamily",
        color: "color",
      };
      Object.entries(textProps).forEach(([key, cssProp]) => {
        if (styles.text[key] !== undefined) {
          element.style[cssProp] = styles.text[key];
        }
      });
    }
  }

  /* ---------- message handlers ------------------------------------------ */

  function handleGetStyles(data) {
    const { elementId, runtimeId } = data;
    const element = findElementByDyadId(elementId, runtimeId);
    if (element) {
      const computedStyle = window.getComputedStyle(element);
      const styles = {
        margin: {
          top: computedStyle.marginTop,
          right: computedStyle.marginRight,
          bottom: computedStyle.marginBottom,
          left: computedStyle.marginLeft,
        },
        padding: {
          top: computedStyle.paddingTop,
          right: computedStyle.paddingRight,
          bottom: computedStyle.paddingBottom,
          left: computedStyle.paddingLeft,
        },
        border: {
          width: computedStyle.borderWidth,
          radius: computedStyle.borderRadius,
          color: computedStyle.borderColor,
        },
        backgroundColor: computedStyle.backgroundColor,
        text: {
          fontSize: computedStyle.fontSize,
          fontWeight: computedStyle.fontWeight,
          fontFamily: computedStyle.fontFamily,
          color: computedStyle.color,
        },
      };

      window.parent.postMessage(
        {
          type: "dyad-component-styles",
          data: styles,
        },
        "*",
      );
    }
  }

  function handleModifyStyles(data) {
    const { elementId, runtimeId, styles } = data;
    const element = findElementByDyadId(elementId, runtimeId);
    if (element) {
      applyStyles(element, styles);

      // Send updated coordinates after style change

      const rect = element.getBoundingClientRect();
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

  function handleEnableTextEditing(data) {
    const { componentId, runtimeId } = data;

    // Clean up any existing text editing states first
    textEditingState.forEach((state, existingId) => {
      if (existingId !== componentId) {
        state.cleanup();
      }
    });

    const element = findElementByDyadId(componentId, runtimeId);
    if (element) {
      const originalText = element.innerText;
      const rect = element.getBoundingClientRect();

      const prevOutline = element.style.outline;
      const prevOutlineOffset = element.style.outlineOffset;
      const prevBoxShadow = element.style.boxShadow;
      element.style.outline = "3px solid #dc2626";
      element.style.outlineOffset = "2px";
      element.style.boxShadow = "0 0 0 1px rgba(220, 38, 38, 0.35)";

      // Inline action bar so users can explicitly save/cancel text edits.
      const actionBar = document.createElement("div");
      const BAR_GAP = 6;
      const BAR_MIN_MARGIN = 8;
      Object.assign(actionBar.style, {
        position: "absolute",
        left: `${rect.left + window.scrollX}px`,
        top: `${rect.bottom + window.scrollY + BAR_GAP}px`,
        zIndex: "2147483647",
        display: "flex",
        gap: "8px",
        padding: "6px",
        borderRadius: "8px",
        border: "1px solid rgba(255,255,255,0.2)",
        background: "rgba(17, 24, 39, 0.96)",
        boxShadow: "0 8px 20px rgba(0,0,0,0.35)",
        fontFamily: "Inter, system-ui, sans-serif",
      });
      actionBar.setAttribute("data-dyad-inline-editor", "true");

      const hint = document.createElement("span");
      hint.textContent = "Enter = Save, Esc = Cancel";
      Object.assign(hint.style, {
        color: "rgba(229, 231, 235, 0.9)",
        fontSize: "11px",
        alignSelf: "center",
        marginLeft: "2px",
        whiteSpace: "nowrap",
      });

      actionBar.appendChild(hint);
      document.body.appendChild(actionBar);

      const positionActionBar = () => {
        const barRect = actionBar.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const placeBelow = rect.bottom + BAR_GAP + barRect.height <= vh - BAR_MIN_MARGIN;
        const placeAbove = rect.top - BAR_GAP - barRect.height >= BAR_MIN_MARGIN;

        let desiredTop = rect.bottom + BAR_GAP;
        if (!placeBelow && placeAbove) {
          desiredTop = rect.top - BAR_GAP - barRect.height;
        }

        // Prefer absolute (follows element scroll), fallback to fixed when clipping risk is high.
        const wouldClipBottom = desiredTop + barRect.height > vh - BAR_MIN_MARGIN;
        const wouldClipTop = desiredTop < BAR_MIN_MARGIN;
        if (wouldClipBottom || wouldClipTop) {
          actionBar.style.position = "fixed";
          desiredTop = Math.min(
            vh - barRect.height - BAR_MIN_MARGIN,
            Math.max(BAR_MIN_MARGIN, rect.bottom + BAR_GAP)
          );
        } else {
          actionBar.style.position = "absolute";
          desiredTop += window.scrollY;
        }

        const maxLeft = vw - barRect.width - BAR_MIN_MARGIN;
        const desiredLeft = Math.min(maxLeft, Math.max(BAR_MIN_MARGIN, rect.left));
        actionBar.style.left = `${Math.max(BAR_MIN_MARGIN, desiredLeft)}px`;
        actionBar.style.top = `${Math.max(BAR_MIN_MARGIN, desiredTop)}px`;
      };
      positionActionBar();

      element.contentEditable = "true";
      element.focus();

      // Select all text
      const range = document.createRange();
      range.selectNodeContents(element);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);

      // Send updates as user types
      const onInput = () => {
        const currentText = element.innerText;

        // Update tracked state
        const state = textEditingState.get(componentId);
        if (state) {
          state.currentText = currentText;
        }

        window.parent.postMessage(
          {
            type: "dyad-text-updated",
            componentId,
            text: currentText,
          },
          "*",
        );
      };

      element.addEventListener("input", onInput);

      // Prevent click from propagating to selector while editing
      const stopProp = (e) => e.stopPropagation();
      element.addEventListener("click", stopProp);

      const removeListeners = () => {
        element.removeEventListener("input", onInput);
        element.removeEventListener("click", stopProp);
        element.removeEventListener("keydown", onKeydown);
        element.removeEventListener("blur", onBlur);
        window.removeEventListener("resize", positionActionBar);
        window.removeEventListener("scroll", positionActionBar, true);
        actionBar.remove();
      };

      const requestDeselect = () => {
        window.parent.postMessage(
          {
            type: "dyad-component-deselected",
            componentId,
            runtimeId,
          },
          "*",
        );
      };

      const onSaveClick = (e) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        const st = textEditingState.get(componentId);
        if (st) {
          st.cleanup();
        }
        requestDeselect();
      };

      const onCancelClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        element.innerText = originalText;
        element.contentEditable = "false";
        element.style.outline = prevOutline;
        element.style.outlineOffset = prevOutlineOffset;
        element.style.boxShadow = prevBoxShadow;
        removeListeners();
        textEditingState.delete(componentId);
        window.parent.postMessage(
          {
            type: "dyad-text-editing-cancelled",
            componentId,
          },
          "*",
        );
        requestDeselect();
      };

      window.addEventListener("resize", positionActionBar);
      window.addEventListener("scroll", positionActionBar, true);

      const onKeydown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          onSaveClick(e);
          return;
        }
        if (e.key === "Escape") {
          onCancelClick(e);
        }
      };

      const onBlur = () => {
        // Defer so focus moves (e.g. toolbar) are settled
        setTimeout(() => {
          const st = textEditingState.get(componentId);
          if (!st || document.activeElement === element) return;
          st.cleanup();
        }, 0);
      };

      element.addEventListener("keydown", onKeydown);
      element.addEventListener("blur", onBlur);

      // Cleanup function (save path: blur or parent disable-dyad-text-editing)
      const cleanup = () => {
        if (!textEditingState.has(componentId)) return;
        element.contentEditable = "false";
        element.style.outline = prevOutline;
        element.style.outlineOffset = prevOutlineOffset;
        element.style.boxShadow = prevBoxShadow;
        removeListeners();

        const finalText = element.innerText;
        const context = {
          tagName: (element.tagName || "").toLowerCase(),
          parentText: (element.parentElement?.innerText || "").trim().slice(0, 220),
          previousSiblingText:
            (element.previousElementSibling?.innerText || "").trim().slice(0, 120),
          nextSiblingText:
            (element.nextElementSibling?.innerText || "").trim().slice(0, 120),
        };
        window.parent.postMessage(
          {
            type: "dyad-text-finalized",
            componentId,
            text: finalText,
            previousText: originalText,
            context,
          },
          "*",
        );

        textEditingState.delete(componentId);
      };

      // Store state
      textEditingState.set(componentId, {
        originalText,
        currentText: originalText,
        cleanup,
      });
    }
  }

  function handleDisableTextEditing(data) {
    const { componentId } = data;
    const state = textEditingState.get(componentId);
    if (state) {
      state.cleanup();
    }
  }

  function handleGetTextContent(data) {
    const { componentId, runtimeId } = data;
    const element = findElementByDyadId(componentId, runtimeId);
    const state = textEditingState.get(componentId);

    window.parent.postMessage(
      {
        type: "dyad-text-content-response",
        componentId,
        text: state ? state.currentText : element ? element.innerText : null,
        isEditing: !!state,
      },
      "*",
    );
  }

  /* ---------- message bridge -------------------------------------------- */

  window.addEventListener("message", (e) => {
    if (e.source !== window.parent) return;

    const { type, data } = e.data;

    switch (type) {
      case "get-dyad-component-styles":
        handleGetStyles(data);
        break;
      case "modify-dyad-component-styles":
        handleModifyStyles(data);
        break;
      case "enable-dyad-text-editing":
        handleEnableTextEditing(data);
        break;
      case "disable-dyad-text-editing":
        handleDisableTextEditing(data);
        break;
      case "get-dyad-text-content":
        handleGetTextContent(data);
        break;
      case "cleanup-all-text-editing":
        // Clean up all text editing states
        textEditingState.forEach((state) => {
          state.cleanup();
        });
        break;
    }
  });
})();
