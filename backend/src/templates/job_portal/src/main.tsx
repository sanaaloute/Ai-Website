import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ToastProvider } from '@/hooks/useToast';
import { ToastContainer } from '@/components/ui/Toast';
import './index.css';
import './styles/tokens.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <App />
        <ToastContainer />
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>,
);

(window as unknown as { __lovecodePreviewReady?: boolean }).__lovecodePreviewReady = true;
if (window.parent !== window) {
  window.parent.postMessage({ type: 'LOVECODE_PREVIEW_READY', ts: Date.now() }, '*');
}
