import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import { ErrorBoundary } from './components/error/ErrorBoundary';
import { initializeMonitoring, cleanupMonitoring } from './lib/monitoring';
import App from './App.tsx';
import './index.css';

// Initialize monitoring system
initializeMonitoring({
  environment: import.meta.env.MODE,
  sentryDsn: import.meta.env.VITE_SENTRY_DSN,
  logLevel: import.meta.env.DEV ? 'debug' : 'info',
  enablePerformanceMonitoring: true,
  enableRemoteLogging: import.meta.env.PROD
});

// Cleanup monitoring on page unload
window.addEventListener('beforeunload', cleanupMonitoring);

// Register service worker for caching
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary level="critical" onError={(error, errorInfo) => {
      console.error('Critical app error:', error, errorInfo);
    }}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ToastProvider>
            <AuthProvider>
              <ThemeProvider>
                <ErrorBoundary level="page">
                  <App />
                </ErrorBoundary>
              </ThemeProvider>
            </AuthProvider>
          </ToastProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
