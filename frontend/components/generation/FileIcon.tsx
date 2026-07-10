'use client';

import { SiJavascript, SiReact, SiCss, SiJson } from '@/lib/icons';
import { FiFile } from '@/lib/icons';

export function FileIcon({ fileName }: { fileName: string }) {
  const ext = fileName.split('.').pop()?.toLowerCase();

  if (ext === 'jsx' || ext === 'js') {
    return <SiJavascript style={{ width: '14px', height: '14px' }} className="text-amber-400/80" />;
  } else if (ext === 'tsx' || ext === 'ts') {
    return <SiReact style={{ width: '14px', height: '14px' }} className="text-sky-400/80" />;
  } else if (ext === 'css') {
    return <SiCss style={{ width: '14px', height: '14px' }} className="text-blue-400/80" />;
  } else if (ext === 'json') {
    return <SiJson style={{ width: '14px', height: '14px' }} className="text-emerald-400/70" />;
  } else if (ext === 'html') {
    return <FiFile style={{ width: '14px', height: '14px' }} className="text-orange-400/70" />;
  } else {
    return <FiFile style={{ width: '14px', height: '14px' }} className="text-zinc-500/70" />;
  }
}
