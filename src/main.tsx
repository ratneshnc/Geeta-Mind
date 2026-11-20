import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Prevent third-party browser extension injected script errors from disrupting the app
window.addEventListener('error', (event) => {
  if (
    typeof event.filename === 'string' &&
    (event.filename.startsWith('chrome-extension://') ||
      event.filename.startsWith('moz-extension://'))
  ) {
    event.preventDefault();
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const stack = String((event.reason as { stack?: string })?.stack ?? '');
  if (
    stack.includes('chrome-extension://') ||
    stack.includes('moz-extension://')
  ) {
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
