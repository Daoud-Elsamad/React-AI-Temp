import { Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';
import { DashboardPage } from './pages/DashboardPage';
import { ContactPage } from './pages/ContactPage';
import './App.css';

function App() {
  return (
    <Routes>
      {/* Public routes with basic layout */}
      <Route
        path="/"
        element={
          <MainLayout>
            <HomePage />
          </MainLayout>
        }
      />
      <Route
        path="/about"
        element={
          <MainLayout>
            <AboutPage />
          </MainLayout>
        }
      />
      <Route
        path="/contact"
        element={
          <MainLayout>
            <ContactPage />
          </MainLayout>
        }
      />

      {/* Dashboard routes with sidebar */}
      <Route
        path="/dashboard"
        element={
          <MainLayout showSidebar>
            <DashboardPage />
          </MainLayout>
        }
      />
      <Route
        path="/analytics"
        element={
          <MainLayout showSidebar>
            <div className="p-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Analytics
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Analytics page coming soon...
              </p>
            </div>
          </MainLayout>
        }
      />
      <Route
        path="/settings"
        element={
          <MainLayout showSidebar>
            <div className="p-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Settings
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Settings page coming soon...
              </p>
            </div>
          </MainLayout>
        }
      />
      <Route
        path="/help"
        element={
          <MainLayout showSidebar>
            <div className="p-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Help
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Help center coming soon...
              </p>
            </div>
          </MainLayout>
        }
      />

      {/* 404 fallback */}
      <Route
        path="*"
        element={
          <MainLayout>
            <div className="min-h-[60vh] flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-6xl font-bold text-gray-300 dark:text-gray-600 mb-4">
                  404
                </h1>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                  Page Not Found
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-8">
                  The page you're looking for doesn't exist.
                </p>
                <a
                  href="/"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Go Home
                </a>
              </div>
            </div>
          </MainLayout>
        }
      />
    </Routes>
  );
}

export default App;
