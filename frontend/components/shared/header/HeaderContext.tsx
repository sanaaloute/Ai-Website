"use client";

import { usePathname } from "next/navigation";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

interface HeaderContextType {
  dropdownContent: React.ReactNode;
  setDropdownContent: (content: React.ReactNode) => void;
  clearDropdown: (force?: boolean) => void;
  resetDropdownTimeout: () => void;
  dropdownKey: number;
  headerHeight: React.RefObject<number>;
  headerTop: React.RefObject<number>;
}

const HeaderContext = createContext<HeaderContextType | undefined>(undefined);

export const HeaderProvider = ({ children }: { children: React.ReactNode }) => {
  const [dropdownContent, setDropdownContentState] = useState<React.ReactNode>(null);
  const [dropdownKey, setDropdownKey] = useState(0);
  const headerHeight = useRef(0);
  const headerTop = useRef(0);
  const pathname = usePathname();
  const timeout = useRef<number | null>(null);
  const dropdownContentRef = useRef(dropdownContent);

  useEffect(() => {
    dropdownContentRef.current = dropdownContent;
  }, [dropdownContent]);

  const resetDropdownTimeout = useCallback(() => {
    if (timeout.current) {
      clearTimeout(timeout.current);
      timeout.current = null;
    }
  }, []);

  const clearDropdown = useCallback((force?: boolean) => {
    if (force) {
      setDropdownContentState(null);
      return;
    }

    resetDropdownTimeout();

    timeout.current = window.setTimeout(() => {
      setDropdownContentState(null);
    }, 500);
  }, [resetDropdownTimeout]);

  const setDropdownContent = useCallback((content: React.ReactNode) => {
    resetDropdownTimeout();

    // Avoid re-triggering a render/key bump if the content is identical.
    if (content === dropdownContentRef.current) return;

    setDropdownKey((prev) => prev + 1);
    setDropdownContentState(content);
  }, [resetDropdownTimeout]);

  useEffect(() => {
    const header = document.querySelector(".header") as HTMLElement;

    if (header) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          headerHeight.current = entry.contentRect.height;
        }
      });

      resizeObserver.observe(header);
      headerHeight.current = header.clientHeight;
      headerTop.current = header.getBoundingClientRect().top;

      const onScroll = () => {
        headerTop.current = header.getBoundingClientRect().top;
      };

      window.addEventListener("scroll", onScroll, { passive: true });

      return () => {
        resizeObserver.disconnect();
        window.removeEventListener("scroll", onScroll);
      };
    }
  }, [pathname]);

  const contextValue = useMemo(
    () => ({
      dropdownContent,
      setDropdownContent,
      clearDropdown,
      resetDropdownTimeout,
      dropdownKey,
      headerHeight,
      headerTop,
    }),
    [dropdownContent, setDropdownContent, clearDropdown, resetDropdownTimeout, dropdownKey]
  );

  return (
    <HeaderContext.Provider value={contextValue}>
      {children}
    </HeaderContext.Provider>
  );
};

export const useHeaderContext = () => {
  const context = useContext(HeaderContext);

  if (!context) {
    throw new Error("useHeaderContext must be used within a HeaderProvider");
  }

  return context;
};

export const useHeaderHeight = () => {
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    const header = document.querySelector(".header");

    if (header) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setHeaderHeight(entry.contentRect.height);
        }
      });

      resizeObserver.observe(header);

      return () => {
        resizeObserver.disconnect();
      };
    }
  }, []);

  return { headerHeight };
};
