import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import './index.css';

/**
 * Suppress the benign "ResizeObserver loop completed with undelivered notifications" error.
 * This is a common browser-level quirk in complex resizable layouts (like those containing 
 * Monaco editors or heavy flexbox interactions) that doesn't affect functionality.
 */
const suppressResizeObserverError = () => {
  const isResizeObserverError = (msg: string): boolean => {
    if (!msg) return false;
    return msg.includes('ResizeObserver loop completed') || 
           msg.includes('ResizeObserver loop limit');
  };

  const errorHandler = (e: ErrorEvent) => {
    if (isResizeObserverError(e.message)) {
      // Prevents the error from propagating to the console and developer tools overlays
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  };

  const rejectionHandler = (e: PromiseRejectionEvent) => {
    const reasonMessage = e.reason?.message || '';
    if (isResizeObserverError(reasonMessage)) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  };

  // Attach listeners with capture to catch them as early as possible
  window.addEventListener('error', errorHandler, true);
  window.addEventListener('unhandledrejection', rejectionHandler, true);
};

suppressResizeObserverError();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
