import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { Loading } from './components/ui/Loading';
import { ErrorBoundary } from './components/error/ErrorBoundary';
import { NotFoundPage } from './pages/ErrorPages';
import './App.css';

// Lazy load all pages for code splitting
const HomePage = React.lazy(() => import('./pages/HomePage').then(module => ({ default: module.HomePage })));
const AboutPage = React.lazy(() => import('./pages/AboutPage').then(module => ({ default: module.AboutPage })));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage').then(module => ({ default: module.DashboardPage })));
const ContactPage = React.lazy(() => import('./pages/ContactPage').then(module => ({ default: module.ContactPage })));
const UIShowcasePage = React.lazy(() => import('./pages/UIShowcasePage').then(module => ({ default: module.UIShowcasePage })));
const FormsShowcasePage = React.lazy(() => import('./pages/FormsShowcasePage').then(module => ({ default: module.FormsShowcasePage })));
const AuthPage = React.lazy(() => import('./pages/AuthPage').then(module => ({ default: module.AuthPage })));
const AIPage = React.lazy(() => import('./pages/AIPage').then(module => ({ default: module.AIPage })));
const FileManagementPage = React.lazy(() => import('./pages/FileManagementPage').then(module => ({ default: module.FileManagementPage })));
const AIFileProcessingPage = React.lazy(() => import('./pages/AIFileProcessingPage').then(module => ({ default: module.AIFileProcessingPage })));
const PerformancePage = React.lazy(() => import('./pages/PerformancePage').then(module => ({ default: module.PerformancePage })));
const MonitoringDemoPage = React.lazy(() => import('./pages/MonitoringDemoPage').then(module => ({ default: module.MonitoringDemoPage })));

// Reusable loading fallback component
const PageLoading = () => <Loading variant="page" />;

function App() {
  return (
    <Routes>
      {/* Public routes with basic layout */}
      <Route
        path="/"
        element={
          <MainLayout>
            <ErrorBoundary level="component">
              <Suspense fallback={<PageLoading />}>
                <HomePage />
              </Suspense>
            </ErrorBoundary>
          </MainLayout>
        }
      />
      <Route
        path="/about"
        element={
          <MainLayout>
            <Suspense fallback={<PageLoading />}>
              <AboutPage />
            </Suspense>
          </MainLayout>
        }
      />
      <Route
        path="/contact"
        element={
          <MainLayout>
            <Suspense fallback={<PageLoading />}>
              <ContactPage />
            </Suspense>
          </MainLayout>
        }
      />
      <Route
        path="/ui-showcase"
        element={
          <MainLayout>
            <Suspense fallback={<PageLoading />}>
              <UIShowcasePage />
            </Suspense>
          </MainLayout>
        }
      />
      <Route
        path="/forms-showcase"
        element={
          <MainLayout>
            <Suspense fallback={<PageLoading />}>
              <FormsShowcasePage />
            </Suspense>
          </MainLayout>
        }
      />
      <Route
        path="/ai"
        element={
          <MainLayout>
            <ErrorBoundary level="component">
              <Suspense fallback={<PageLoading />}>
                <AIPage />
              </Suspense>
            </ErrorBoundary>
          </MainLayout>
        }
      />
      <Route
        path="/auth"
        element={
          <MainLayout>
            <Suspense fallback={<PageLoading />}>
              <AuthPage />
            </Suspense>
          </MainLayout>
        }
      />
      <Route
        path="/files"
        element={
          <MainLayout>
            <Suspense fallback={<PageLoading />}>
              <FileManagementPage />
            </Suspense>
          </MainLayout>
        }
      />
      <Route
        path="/ai-files"
        element={
          <MainLayout>
            <Suspense fallback={<PageLoading />}>
              <AIFileProcessingPage />
            </Suspense>
          </MainLayout>
        }
      />
      <Route
        path="/performance"
        element={
          <MainLayout>
            <Suspense fallback={<PageLoading />}>
              <PerformancePage />
            </Suspense>
          </MainLayout>
        }
      />

      {/* Dashboard routes with sidebar */}
      <Route
        path="/dashboard"
        element={
          <MainLayout showSidebar>
            <ErrorBoundary level="component">
              <Suspense fallback={<PageLoading />}>
                <DashboardPage />
              </Suspense>
            </ErrorBoundary>
          </MainLayout>
        }
      />
      <Route
        path="/analytics"
        element={
          <MainLayout showSidebar>
            <Suspense fallback={<PageLoading />}>
              <div className="p-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Analytics
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  Analytics page coming soon...
                </p>
              </div>
            </Suspense>
          </MainLayout>
        }
      />
      <Route
        path="/settings"
        element={
          <MainLayout showSidebar>
            <Suspense fallback={<PageLoading />}>
              <div className="p-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Settings
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  Settings page coming soon...
                </p>
              </div>
            </Suspense>
          </MainLayout>
        }
      />
      <Route
        path="/help"
        element={
          <MainLayout showSidebar>
            <Suspense fallback={<PageLoading />}>
              <div className="p-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Help
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  Help center coming soon...
                </p>
              </div>
            </Suspense>
          </MainLayout>
        }
      />
      <Route
        path="/monitoring-demo"
        element={
          <MainLayout>
            <ErrorBoundary level="component">
              <Suspense fallback={<PageLoading />}>
                <MonitoringDemoPage />
              </Suspense>
            </ErrorBoundary>
          </MainLayout>
        }
      />

      {/* 404 fallback */}
      <Route
        path="*"
        element={<NotFoundPage />}
      />
    </Routes>
  );
}

export default App;
