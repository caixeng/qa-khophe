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
} else if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  // Hủy đăng ký Service Worker cũ trên localhost để không xung đột cache với Vite dev server
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
}
