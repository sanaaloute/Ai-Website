import React from 'react';
import type { SandboxData } from '@/hooks/useWorkspaceSandbox';
import type { ChatMessage } from '@/hooks/useWorkspaceChat';
import { createZipRaw } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/generation/pageUtils';
import { assertCurrentSandboxIdStrict } from '@/lib/sandbox/sandboxClientSession';

export interface DownloadZipDeps {
  sandboxData: SandboxData | null;
  zipNoticeTimerRef: React.MutableRefObject<number | null>;
  setIsDownloadingZip: (v: boolean) => void;
  setZipNotice: (v: { status: string; message: string } | null) => void;
  log: (message: string, type?: 'info' | 'error' | 'command') => void;
  addChatMessage: (content: string, type: ChatMessage['type'], metadata?: ChatMessage['metadata']) => void;
  conversationContext: {
    currentProject: string;
  };
  projectId?: string | null;
}

export async function downloadZip(deps: DownloadZipDeps): Promise<void> {
  const {
    sandboxData,
    zipNoticeTimerRef,
    setIsDownloadingZip,
    setZipNotice,
    log,
    addChatMessage,
    conversationContext,
  } = deps;

  if (!sandboxData) {
    addChatMessage('Please wait for the sandbox to be created before downloading.', 'system');
    return;
  }

  if (!assertCurrentSandboxIdStrict(sandboxData.sandboxId, 'downloadZip')) {
    addChatMessage('Sandbox has changed. Please retry the download.', 'system');
    return;
  }

  if (zipNoticeTimerRef.current) {
    window.clearTimeout(zipNoticeTimerRef.current);
    zipNoticeTimerRef.current = null;
  }
  setIsDownloadingZip(true);
  setZipNotice({
    status: 'preparing',
    message: 'Preparing ZIP file...',
  });
  log('Creating zip file...');
  addChatMessage('Creating ZIP file of your Next.js app...', 'system');

  try {
    const response = await createZipRaw({
      sandboxId: sandboxData?.sandboxId,
      projectName: conversationContext.currentProject,
      projectId: deps.projectId || undefined,
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(data?.error || `ZIP request failed (${response.status})`);
    }

    const contentType = response.headers.get('content-type') || '';
    let blob: Blob;
    let fileName = 'e2b-project.zip';

    if (contentType.includes('application/json')) {
      const data = (await response.json()) as {
        success?: boolean;
        downloadUrl?: string;
        fileName?: string;
        base64?: string;
        error?: string;
      };
      if (!data.success) {
        throw new Error(data.error || 'ZIP request returned unsuccessful');
      }
      fileName = data.fileName || fileName;

      if (typeof data.downloadUrl === 'string' && data.downloadUrl.length > 0) {
        const zipRes = await fetch(data.downloadUrl);
        if (!zipRes.ok) {
          throw new Error(`Failed to fetch zip from storage (${zipRes.status})`);
        }
        blob = await zipRes.blob();
      } else if (typeof data.base64 === 'string' && data.base64.length > 0) {
        // Legacy base64 fallback
        const clean = data.base64.replace(/\s+/g, '');
        const binary = window.atob(clean);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        blob = new Blob([bytes], { type: 'application/zip' });
      } else {
        throw new Error('ZIP payload missing.');
      }
    } else {
      // Raw zip stream from sandbox fallback
      blob = await response.blob();
      // Try to extract filename from Content-Disposition header
      const disposition = response.headers.get('content-disposition') || '';
      const match = disposition.match(/filename="([^"]+)"/);
      if (match) {
        fileName = match[1];
      }
    }

    log('Zip file ready!');
    addChatMessage('ZIP file ready! Download starting...', 'system');

    let objectUrl: string | null = null;
    try {
      objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      if (objectUrl) {
        setTimeout(() => URL.revokeObjectURL(objectUrl as string), 2000);
      }
    }

    setZipNotice({
      status: 'ready',
      message: 'ZIP ready. Download should start now.',
    });
    zipNoticeTimerRef.current = window.setTimeout(() => {
      setZipNotice(null);
      zipNoticeTimerRef.current = null;
    }, 3200);

    addChatMessage(
      'Your Next.js app has been downloaded! To run it locally:\n' +
      '1. Unzip the file\n' +
      '2. Run: npm install\n' +
      '3. Run: npm run dev\n' +
      '4. Open http://localhost:3000',
      'system'
    );
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    log(`Failed to create zip: ${errorMessage}`, 'error');
    addChatMessage(`Failed to create ZIP: ${errorMessage}`, 'system');
    setZipNotice({
      status: 'error',
      message: `ZIP failed: ${errorMessage || 'Unknown error'}`,
    });
    zipNoticeTimerRef.current = window.setTimeout(() => {
      setZipNotice(null);
      zipNoticeTimerRef.current = null;
    }, 5000);
  } finally {
    setIsDownloadingZip(false);
  }
}
