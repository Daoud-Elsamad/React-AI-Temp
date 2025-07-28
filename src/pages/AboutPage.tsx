import { PageWrapper } from '@/components/layout/PageWrapper';

export function AboutPage() {
  return (
    <PageWrapper
      title="About React AI Template"
      subtitle="Learn more about this comprehensive React application template"
    >
      <div className="space-y-8">
        <div className="prose prose-lg dark:prose-invert max-w-none">
          <h2>Overview</h2>
          <p>
            React AI Template is a comprehensive, production-ready template for
            building modern React applications with artificial intelligence
            capabilities. It combines the latest best practices in React
            development with a robust foundation for AI integration.
          </p>

          <h2>Technology Stack</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 not-prose">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Frontend
              </h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                <li>• React 18 with TypeScript</li>
                <li>• Vite for build tooling</li>
                <li>• Tailwind CSS for styling</li>
                <li>• React Router for navigation</li>
                <li>• Zustand for state management</li>
              </ul>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Development
              </h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                <li>• ESLint + Prettier</li>
                <li>• Husky git hooks</li>
                <li>• React Query for API management</li>
                <li>• React Hook Form + Zod</li>
                <li>• Axios for HTTP requests</li>
              </ul>
            </div>
          </div>

          <h2>Features</h2>
          <p>
            This template includes everything you need to start building a
            modern web application:
          </p>
          <ul>
            <li>
              Fully responsive layout system with header, sidebar, and footer
            </li>
            <li>Dark/light theme support with smooth transitions</li>
            <li>Type-safe development with TypeScript</li>
            <li>Pre-configured development tools and linting</li>
            <li>Form handling with validation</li>
            <li>API integration patterns</li>
            <li>Mobile-first responsive design</li>
          </ul>

          <h2>Getting Started</h2>
          <p>
            The template is organized into phases for systematic development:
          </p>
          <ol>
            <li>
              <strong>Phase 1:</strong> Foundation Setup (Complete)
            </li>
            <li>
              <strong>Phase 2:</strong> Basic UI Infrastructure (In Progress)
            </li>
            <li>
              <strong>Phase 3:</strong> Authentication System
            </li>
            <li>
              <strong>Phase 4:</strong> AI Integration
            </li>
            <li>
              <strong>Phase 5:</strong> Advanced Features
            </li>
          </ol>
        </div>
      </div>
    </PageWrapper>
  );
}
