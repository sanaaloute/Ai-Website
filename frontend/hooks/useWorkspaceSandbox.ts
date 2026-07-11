import { useState, useRef, useEffect } from 'react';
import { setCurrentSandboxId } from '@/lib/sandbox/sandboxClientSession';

export interface SandboxData {
  sandboxId: string;
  url: string;
  createdAt?: string;
  endAt?: string;
  [key: string]: unknown;
}

export function useWorkspaceSandbox() {
  const [sandboxData, setSandboxData] = useState<SandboxData | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewHealthIssue, setPreviewHealthIssue] = useState<string | null>(null);
  const [visualSelectMode, setVisualSelectMode] = useState(false);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  const [isScreenshotLoaded, setIsScreenshotLoaded] = useState(false);
  const [isLandingBoot, setIsLandingBoot] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const latestSandboxDataRef = useRef<SandboxData | null>(null);
  const sandboxDataRef = useRef<SandboxData | null>(null);
  const checkSandboxStatusRef = useRef<() => Promise<void>>(async () => {});
  const sandboxCreationRef = useRef<boolean>(false);
  // Preview health tracking refs
  const latestPreviewErrorRef = useRef<string | null>(null);
  const lastPreviewReadyAtRef = useRef<number>(0);
  const lastPreviewIframeLoadAtRef = useRef<number>(0);
  const lastPreviewErrorTextRef = useRef<string>('');
  const lastPreviewErrorAtRef = useRef<number>(0);

  // Keep refs in sync with state so async callbacks see the latest data.
  useEffect(() => {
    latestSandboxDataRef.current = sandboxData;
    sandboxDataRef.current = sandboxData;
  }, [sandboxData]);

  // Wrapped setter that also updates the ref synchronously to eliminate races
  // with callers that read the ref immediately after setting state.
  const setSandboxDataSync = (data: SandboxData | null) => {
    sandboxDataRef.current = data;
    latestSandboxDataRef.current = data;
    setSandboxData(data);
    setCurrentSandboxId(data?.sandboxId ?? null);
  };

  return {
    // State
    sandboxData,
    setSandboxData: setSandboxDataSync,
    previewError,
    setPreviewError,
    previewHealthIssue,
    setPreviewHealthIssue,
    visualSelectMode,
    setVisualSelectMode,
    screenshotError,
    setScreenshotError,
    isScreenshotLoaded,
    setIsScreenshotLoaded,
    isLandingBoot,
    setIsLandingBoot,
    // Refs
    iframeRef,
    latestSandboxDataRef,
    sandboxDataRef,
    checkSandboxStatusRef,
    // Preview health refs
    latestPreviewErrorRef,
    lastPreviewReadyAtRef,
    lastPreviewIframeLoadAtRef,
    lastPreviewErrorTextRef,
    lastPreviewErrorAtRef,
    sandboxCreationRef,
  };
}
