import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ToastProvider } from '@/hooks/useToast';
import { ToastContainer } from '@/components/ui/Toast';
import { SettingsProvider } from '@/lib/settings';
import './index.css';
import './styles/tokens.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <SettingsProvider>
          <App />
        </SettingsProvider>
        <ToastContainer />
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>,
);

(window as any).__aiWebsitePreviewReady = true;
if (window.parent !== window) {
  window.parent.postMessage({ type: 'AI_WEBSITE_PREVIEW_READY', ts: Date.now() }, '*');
}
