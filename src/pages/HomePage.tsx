import { Link } from 'react-router-dom';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { ExampleForm } from '@/components/ExampleForm';

export function HomePage() {
  const features = [
    {
      name: 'Modern Tech Stack',
      description:
        'Built with React 18, TypeScript, Vite, and Tailwind CSS for optimal performance.',
      icon: '⚡',
    },
    {
      name: 'State Management',
      description:
        'Zustand for simple and effective state management across your application.',
      icon: '🔄',
    },
    {
      name: 'API Integration',
      description:
        'React Query and Axios configured for seamless data fetching and caching.',
      icon: '🌐',
    },
    {
      name: 'Form Handling',
      description:
        'React Hook Form with Zod validation for robust form management.',
      icon: '📝',
    },
    {
      name: 'Responsive Design',
      description:
        'Mobile-first responsive design that works perfectly on all devices.',
      icon: '📱',
    },
    {
      name: 'Dark Mode',
      description: 'Built-in dark mode support with smooth theme transitions.',
      icon: '🌙',
    },
  ];

  return (
    <PageWrapper
      title="React AI Template"
      subtitle="A comprehensive template for building modern React applications with AI capabilities"
    >
      <div className="space-y-16">
        {/* Hero Section */}
        <div className="text-center">
          <div className="flex justify-center space-x-4 mb-8">
            <Link
              to="/dashboard"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              View Dashboard
            </Link>
            <Link
              to="/about"
              className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Learn More
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map(feature => (
              <div
                key={feature.name}
                className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <div className="text-3xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.name}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Status Section */}
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Implementation Status
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-gray-900 dark:text-white">
                  Project Foundation
                </span>
              </div>
              <div className="flex items-center">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-gray-900 dark:text-white">
                  Development Tools
                </span>
              </div>
              <div className="flex items-center">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-gray-900 dark:text-white">
                  Core Dependencies
                </span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-gray-900 dark:text-white">
                  Layout System
                </span>
              </div>
              <div className="flex items-center">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-gray-900 dark:text-white">
                  UI Component Library
                </span>
              </div>
              <div className="flex items-center">
                <span className="text-gray-400 mr-2">⏳</span>
                <span className="text-gray-500 dark:text-gray-400">
                  Authentication
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Example Form */}
        <ExampleForm />
      </div>
    </PageWrapper>
  );
}
