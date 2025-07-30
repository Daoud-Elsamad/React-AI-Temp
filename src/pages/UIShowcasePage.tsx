import React, { useState } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import {
  Button,
  Input,
  TextArea,
  Modal,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Select,
  Icon,
  Loading,
  ToastProvider,
  useToastHelpers,
} from '@/components/ui';

const ToastDemo: React.FC = () => {
  const toast = useToastHelpers();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Toast Notifications</CardTitle>
        <CardDescription>Interactive toast notifications with different variants</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => toast.success('Success!', 'Operation completed successfully')}>
            Success Toast
          </Button>
          <Button 
            variant="error" 
            onClick={() => toast.error('Error!', 'Something went wrong')}
          >
            Error Toast
          </Button>
          <Button 
            variant="warning" 
            onClick={() => toast.warning('Warning!', 'Please check your input')}
          >
            Warning Toast
          </Button>
          <Button 
            variant="outline" 
            onClick={() => toast.info('Info', 'Here is some information')}
          >
            Info Toast
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const ButtonShowcase: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleLoadingDemo = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Buttons</CardTitle>
        <CardDescription>Button components with various variants and sizes</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Variants */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Variants</h4>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="success">Success</Button>
            <Button variant="warning">Warning</Button>
            <Button variant="error">Error</Button>
            <Button variant="link">Link</Button>
          </div>
        </div>

        {/* Sizes */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Sizes</h4>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="xs">Extra Small</Button>
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button size="xl">Extra Large</Button>
          </div>
        </div>

        {/* States */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">States</h4>
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleLoadingDemo} isLoading={isLoading}>
              {isLoading ? 'Loading...' : 'Click to Load'}
            </Button>
            <Button disabled>Disabled</Button>
            <Button leftIcon={<Icon name="plus" />}>With Left Icon</Button>
            <Button rightIcon={<Icon name="chevronRight" />}>With Right Icon</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const FormShowcase: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
    country: '',
  });

  const countries = [
    { value: 'us', label: 'United States' },
    { value: 'ca', label: 'Canada' },
    { value: 'uk', label: 'United Kingdom' },
    { value: 'de', label: 'Germany' },
    { value: 'fr', label: 'France' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Form Components</CardTitle>
        <CardDescription>Input fields, text areas, and select dropdowns</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Input
              label="Name"
              placeholder="Enter your name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <Input
              label="Email"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              leftIcon={<Icon name="user" />}
            />
            <Input
              label="With Error"
              placeholder="This field has an error"
              error="This field is required"
              variant="error"
            />
            <Input
              label="Success State"
              placeholder="This field is valid"
              variant="success"
            />
          </div>
          <div className="space-y-4">
            <Select
              label="Country"
              options={countries}
              value={formData.country}
              onChange={(value) => setFormData({ ...formData, country: value })}
              placeholder="Select a country"
            />
            <TextArea
              label="Message"
              placeholder="Enter your message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              helperText="Maximum 500 characters"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const BadgeShowcase: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Badges</CardTitle>
        <CardDescription>Status indicators and labels</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Variants</h4>
          <div className="flex flex-wrap gap-3">
            <Badge variant="default">Default</Badge>
            <Badge variant="primary">Primary</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="error">Error</Badge>
          </div>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Sizes</h4>
          <div className="flex flex-wrap items-center gap-3">
            <Badge size="sm">Small</Badge>
            <Badge size="md">Medium</Badge>
            <Badge size="lg">Large</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const CardShowcase: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card variant="default">
        <CardHeader>
          <CardTitle>Default Card</CardTitle>
          <CardDescription>This is a default card variant</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Default card content with standard styling and shadow.
          </p>
        </CardContent>
        <CardFooter>
          <Button size="sm">Action</Button>
        </CardFooter>
      </Card>

      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Elevated Card</CardTitle>
          <CardDescription>This is an elevated card variant</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Elevated card with enhanced shadow for prominence.
          </p>
        </CardContent>
        <CardFooter>
          <Button size="sm" variant="outline">Action</Button>
        </CardFooter>
      </Card>

      <Card variant="interactive">
        <CardHeader>
          <CardTitle>Interactive Card</CardTitle>
          <CardDescription>This is an interactive card variant</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Interactive card with hover effects and cursor pointer.
          </p>
        </CardContent>
        <CardFooter>
          <Button size="sm" variant="success">Action</Button>
        </CardFooter>
      </Card>
    </div>
  );
};

const TabsShowcase: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tabs</CardTitle>
        <CardDescription>Tabbed interface components</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-4">
            <h4 className="text-lg font-medium">Overview</h4>
            <p className="text-gray-600 dark:text-gray-400">
              This is the overview tab content. Here you can see general information and statistics.
            </p>
          </TabsContent>
          <TabsContent value="analytics" className="space-y-4">
            <h4 className="text-lg font-medium">Analytics</h4>
            <p className="text-gray-600 dark:text-gray-400">
              Analytics tab showing detailed metrics and performance data.
            </p>
          </TabsContent>
          <TabsContent value="reports" className="space-y-4">
            <h4 className="text-lg font-medium">Reports</h4>
            <p className="text-gray-600 dark:text-gray-400">
              Reports section with downloadable documents and summaries.
            </p>
          </TabsContent>
          <TabsContent value="notifications" className="space-y-4">
            <h4 className="text-lg font-medium">Notifications</h4>
            <p className="text-gray-600 dark:text-gray-400">
              Notification settings and preferences management.
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

const LoadingShowcase: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Loading States</CardTitle>
        <CardDescription>Different loading indicators and states</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Loading Variants</h4>
          <div className="flex flex-wrap items-center gap-6">
            <div className="text-center">
              <Loading variant="spinner" />
              <p className="text-xs text-gray-500 mt-2">Spinner</p>
            </div>
            <div className="text-center">
              <Loading variant="skeleton" />
              <p className="text-xs text-gray-500 mt-2">Skeleton</p>
            </div>
            <div className="text-center">
              <Loading variant="page" />
              <p className="text-xs text-gray-500 mt-2">Page</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export function UIShowcasePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <ToastProvider>
      <PageWrapper
        title="UI Components Showcase"
        subtitle="Comprehensive showcase of all available UI components"
      >
        <div className="space-y-8">
          {/* Buttons */}
          <ButtonShowcase />

          {/* Cards */}
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">Cards</h3>
            <CardShowcase />
          </div>

          {/* Form Components */}
          <FormShowcase />

          {/* Badges */}
          <BadgeShowcase />

          {/* Tabs */}
          <TabsShowcase />

          {/* Loading States */}
          <LoadingShowcase />

          {/* Toast Demo */}
          <ToastDemo />

          {/* Modal Demo */}
          <Card>
            <CardHeader>
              <CardTitle>Modal</CardTitle>
              <CardDescription>Modal dialog component</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setIsModalOpen(true)}>
                Open Modal
              </Button>
              <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Example Modal"
              >
                <div className="space-y-4">
                  <p className="text-gray-600 dark:text-gray-400">
                    This is an example modal dialog. You can place any content here.
                  </p>
                  <div className="flex justify-end space-x-3">
                    <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => setIsModalOpen(false)}>
                      Confirm
                    </Button>
                  </div>
                </div>
              </Modal>
            </CardContent>
          </Card>
        </div>
      </PageWrapper>
    </ToastProvider>
  );
}
