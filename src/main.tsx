import * as React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { installGlobalErrorHandlers } from './lib/errorLog';

installGlobalErrorHandlers();

createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Offline shell là tính năng phụ trợ — không chặn app nếu đăng ký thất bại
    });
  });
}
