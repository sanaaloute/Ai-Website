import { useCallback, useRef, useState } from "react";
import { downloadRepo } from "@/lib/api/client";

export type DownloadStatus =
  | "idle"
  | "cloning"
  | "downloading"
  | "completed"
  | "error"
  | "aborted";

export type DownloadState = {
  status: DownloadStatus;
  repoName: string;
  errorMessage: string | null;
};

export function useTemplateDownload() {
  const [state, setState] = useState<DownloadState>({
    status: "idle",
    repoName: "",
    errorMessage: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const startDownload = useCallback(
    async (repoUrl: string, repoName: string) => {
      // Abort any existing download
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setState({ status: "cloning", repoName, errorMessage: null });

      try {
        setState({ status: "cloning", repoName, errorMessage: null });

        const result = await downloadRepo(repoUrl);

        if (abortController.signal.aborted) {
          setState({ status: "aborted", repoName, errorMessage: null });
          return;
        }

        if (!result.ok) {
          throw new Error(result.error || `HTTP ${result.status}`);
        }

        setState({ status: "downloading", repoName, errorMessage: null });

        // Get the blob and trigger browser download
        const blob = result.data;
        const filename = `ai-website-${repoName}.zip`;

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        setState({ status: "completed", repoName, errorMessage: null });
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          setState({ status: "aborted", repoName, errorMessage: null });
        } else {
          const msg = err instanceof Error ? err.message : "Download failed";
          setState({ status: "error", repoName, errorMessage: msg });
        }
      } finally {
        abortControllerRef.current = null;
      }
    },
    []
  );

  const abortDownload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState((prev) => ({
      ...prev,
      status: prev.status === "cloning" || prev.status === "downloading" ? "aborted" : prev.status,
    }));
  }, []);

  const dismiss = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState({ status: "idle", repoName: "", errorMessage: null });
  }, []);

  return {
    ...state,
    isActive:
      state.status === "cloning" || state.status === "downloading",
    isVisible: state.status !== "idle",
    startDownload,
    abortDownload,
    dismiss,
  };
}
