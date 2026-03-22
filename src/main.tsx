import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CardConfigProvider } from './context';
import { AuthProvider } from './auth/AuthProvider';
import { subscribe } from './analytics';
import { initAnalytics } from './utils/analytics';
import './index.css';
import App from './App';

// Initialize Sentry + PostHog (no-ops gracefully without env vars)
initAnalytics();

// Dev-mode analytics logger
if (import.meta.env.DEV) {
  subscribe((event) => {
    console.log(`[analytics] ${event.type}`, event);
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <CardConfigProvider>
        <App />
      </CardConfigProvider>
    </AuthProvider>
  </StrictMode>,
);
