import { Link } from 'react-router-dom';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '@/components/ui';
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
          <div className="flex justify-center flex-wrap gap-4 mb-8">
            <Link to="/dashboard">
              <Button size="lg">View Dashboard</Button>
            </Link>
            <Link to="/about">
              <Button variant="outline" size="lg">Learn More</Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(feature => (
              <Card key={feature.name} variant="elevated">
                <CardContent className="pt-6">
                  <div className="text-3xl mb-4">{feature.icon}</div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {feature.name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Status Section */}
        <Card variant="elevated" padding="lg">
          <CardHeader>
            <CardTitle className="text-2xl">Implementation Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center">
                  <Badge variant="success" size="sm" className="mr-3">✓</Badge>
                  <span className="text-gray-900 dark:text-white">
                    Project Foundation
                  </span>
                </div>
                <div className="flex items-center">
                  <Badge variant="success" size="sm" className="mr-3">✓</Badge>
                  <span className="text-gray-900 dark:text-white">
                    Development Tools
                  </span>
                </div>
                <div className="flex items-center">
                  <Badge variant="success" size="sm" className="mr-3">✓</Badge>
                  <span className="text-gray-900 dark:text-white">
                    Core Dependencies
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center">
                  <Badge variant="success" size="sm" className="mr-3">✓</Badge>
                  <span className="text-gray-900 dark:text-white">
                    Layout System
                  </span>
                </div>
                <div className="flex items-center">
                  <Badge variant="success" size="sm" className="mr-3">✓</Badge>
                  <span className="text-gray-900 dark:text-white">
                    UI Component Library
                  </span>
                </div>
                <div className="flex items-center">
                  <Badge variant="success" size="sm" className="mr-3">✓</Badge>
                  <span className="text-gray-900 dark:text-white">
                    Form System
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Example Form */}
        <ExampleForm />
      </div>
    </PageWrapper>
  );
}
