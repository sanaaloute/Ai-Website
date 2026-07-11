"use client";

import { useTemplateDownload } from "@/hooks/useTemplateDownload";
import DownloadProgressCard from "@/components/templates/DownloadProgressCard";

export type DownloadTrigger = (repoUrl: string, repoName: string) => void;

import { createContext, useContext } from "react";

const DownloadContext = createContext<DownloadTrigger | null>(null);

export function useTemplateDownloadTrigger(): DownloadTrigger | null {
  return useContext(DownloadContext);
}

type Props = {
  children: React.ReactNode;
};

export default function TemplatesPageShell({ children }: Props) {
  const {
    status,
    repoName,
    errorMessage,
    isActive,
    isVisible,
    startDownload,
    abortDownload,
    dismiss,
  } = useTemplateDownload();

  return (
    <DownloadContext.Provider value={startDownload}>
      {children}
      {isVisible && (
        <DownloadProgressCard
          status={status}
          repoName={repoName}
          errorMessage={errorMessage}
          isActive={isActive}
          onAbort={abortDownload}
          onDismiss={dismiss}
        />
      )}
    </DownloadContext.Provider>
  );
}
