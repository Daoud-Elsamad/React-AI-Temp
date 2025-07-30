import React, { useState } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import {
  Button,
  Input,
  TextArea,
  Modal,
  Dialog,
  Spinner,
  Skeleton,
  LoadingSpinner,
  SkeletonCard,
  ToastProvider,
  useToastHelpers,
  Icon,
  IconButton,
} from '@/components/ui';

const ToastDemo: React.FC = () => {
  const toast = useToastHelpers();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Toast Notifications</h3>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          onClick={() =>
            toast.success('Success!', 'Operation completed successfully')
          }
        >
          Success Toast
        </Button>
        <Button
          variant="destructive"
          onClick={() => toast.error('Error!', 'Something went wrong')}
        >
          Error Toast
        </Button>
        <Button
          variant="secondary"
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
    </div>
  );
};

const UIShowcaseContent: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [textareaValue, setTextareaValue] = useState('');

  return (
    <PageWrapper
      title="UI Component Library"
      subtitle="Comprehensive showcase of all available UI components"
    >
      <div className="space-y-12">
        {/* Buttons Section */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Buttons
          </h2>

          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-3">Button Variants</h3>
              <div className="flex flex-wrap gap-3">
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="link">Link</Button>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Button Sizes</h3>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
                <Button size="xl">Extra Large</Button>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Button States</h3>
              <div className="flex flex-wrap gap-3">
                <Button isLoading>Loading</Button>
                <Button disabled>Disabled</Button>
                <Button leftIcon={<Icon name="plus" size="sm" />}>
                  With Left Icon
                </Button>
                <Button rightIcon={<Icon name="chevronRight" size="sm" />}>
                  With Right Icon
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Inputs Section */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Form Inputs
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Input
                label="Default Input"
                placeholder="Enter text here..."
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
              />

              <Input
                label="Input with Icon"
                placeholder="Search..."
                leftIcon={<Icon name="search" size="sm" />}
              />

              <Input
                label="Input with Error"
                placeholder="Invalid input"
                error="This field is required"
              />

              <Input
                label="Input with Helper Text"
                placeholder="Helper text example"
                helperText="This is some helpful information"
              />

              <div className="space-y-2">
                <label className="text-sm font-medium">Input Sizes</label>
                <Input size="sm" placeholder="Small input" />
                <Input size="md" placeholder="Medium input" />
                <Input size="lg" placeholder="Large input" />
              </div>
            </div>

            <div className="space-y-4">
              <TextArea
                label="Text Area"
                placeholder="Enter your message..."
                value={textareaValue}
                onChange={e => setTextareaValue(e.target.value)}
              />

              <TextArea
                label="Text Area with Error"
                placeholder="This has an error"
                error="Message is too short"
              />

              <TextArea
                label="Non-resizable Text Area"
                placeholder="Cannot be resized"
                resize="none"
              />
            </div>
          </div>
        </section>

        {/* Icons Section */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Icons
          </h2>

          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-3">Icon Sizes</h3>
              <div className="flex items-center gap-4">
                <Icon name="star" size="xs" />
                <Icon name="star" size="sm" />
                <Icon name="star" size="md" />
                <Icon name="star" size="lg" />
                <Icon name="star" size="xl" />
                <Icon name="star" size="2xl" />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Icon Colors</h3>
              <div className="flex items-center gap-4">
                <Icon name="heart" color="current" />
                <Icon name="heart" color="primary" />
                <Icon name="heart" color="success" />
                <Icon name="heart" color="error" />
                <Icon name="heart" color="warning" />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Common Icons</h3>
              <div className="grid grid-cols-8 gap-4">
                {[
                  'check',
                  'x',
                  'plus',
                  'minus',
                  'edit',
                  'delete',
                  'search',
                  'filter',
                  'home',
                  'menu',
                  'user',
                  'users',
                  'settings',
                  'info',
                  'warning',
                  'error',
                ].map(iconName => (
                  <div
                    key={iconName}
                    className="flex flex-col items-center space-y-1"
                  >
                    <Icon name={iconName as any} size="lg" />
                    <span className="text-xs">{iconName}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Icon Buttons</h3>
              <div className="flex gap-3">
                <IconButton
                  icon="edit"
                  variant="ghost"
                  onClick={() => {}}
                  aria-label="Edit"
                />
                <IconButton
                  icon="delete"
                  variant="outline"
                  onClick={() => {}}
                  aria-label="Delete"
                />
                <IconButton
                  icon="settings"
                  variant="solid"
                  onClick={() => {}}
                  aria-label="Settings"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Loading Section */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Loading Components
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Spinners</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <Spinner size="xs" />
                  <Spinner size="sm" />
                  <Spinner size="md" />
                  <Spinner size="lg" />
                  <Spinner size="xl" />
                </div>
                <LoadingSpinner text="Loading data..." />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Skeletons</h3>
              <div className="space-y-3">
                <Skeleton height="1rem" />
                <Skeleton height="1rem" width="80%" />
                <Skeleton height="1rem" width="60%" />
                <div className="flex items-center space-x-3">
                  <Skeleton circle width={40} height={40} />
                  <div className="flex-1 space-y-2">
                    <Skeleton height="1rem" />
                    <Skeleton height="0.875rem" width="70%" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Skeleton Components</h3>
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <SkeletonCard />
            </div>
          </div>
        </section>

        {/* Modals Section */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Modals & Dialogs
          </h2>

          <div className="flex gap-4">
            <Button onClick={() => setModalOpen(true)}>Open Modal</Button>
            <Button onClick={() => setDialogOpen(true)} variant="destructive">
              Open Dialog
            </Button>
          </div>

          <Modal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Example Modal"
            description="This is a demonstration of the modal component"
            size="md"
          >
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                This is the content of the modal. You can put any React
                components here.
              </p>
              <Input placeholder="Example input in modal" />
              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setModalOpen(false)}>Save</Button>
              </div>
            </div>
          </Modal>

          <Dialog
            isOpen={dialogOpen}
            onClose={() => setDialogOpen(false)}
            title="Confirm Action"
            description="Are you sure you want to perform this action? This cannot be undone."
            variant="destructive"
            onConfirm={() => console.log('Confirmed!')}
            onCancel={() => console.log('Cancelled!')}
            confirmText="Delete"
            cancelText="Cancel"
          >
            <p className="text-gray-600 dark:text-gray-400">
              This is a destructive action that will permanently delete the
              selected items.
            </p>
          </Dialog>
        </section>

        {/* Toast Section */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Toast Notifications
          </h2>
          <ToastDemo />
        </section>
      </div>
    </PageWrapper>
  );
};

export const UIShowcasePage: React.FC = () => {
  return (
    <ToastProvider>
      <UIShowcaseContent />
    </ToastProvider>
  );
};
