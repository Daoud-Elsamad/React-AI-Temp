import React from 'react';
import {
  useForm,
  FormProvider,
  UseFormReturn,
  FieldValues,
  SubmitHandler,
  UseFormProps,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ZodSchema } from 'zod';
import { Button, Icon } from '@/components/ui';
import { useToastHelpers } from '@/components/ui';
import { cn } from '@/lib/utils';

export type FormState = 'idle' | 'submitting' | 'success' | 'error';

export interface FormProps<TFieldValues extends FieldValues = FieldValues> {
  schema?: ZodSchema<any>;
  onSubmit: SubmitHandler<TFieldValues>;
  children:
    | React.ReactNode
    | ((methods: UseFormReturn<TFieldValues>) => React.ReactNode);
  className?: string;
  defaultValues?: UseFormProps<TFieldValues>['defaultValues'];
  mode?: UseFormProps<TFieldValues>['mode'];
  resetOnSuccess?: boolean;
  showSuccessMessage?: boolean;
  successMessage?: string;
  errorMessage?: string;
  submitButtonText?: string;
  submitButtonVariant?:
    | 'primary'
    | 'secondary'
    | 'outline'
    | 'ghost'
    | 'destructive';
  showSubmitButton?: boolean;
  disabled?: boolean;
  loading?: boolean;
}

export interface FormSubmissionResult {
  success: boolean;
  message?: string;
  errors?: Record<string, string>;
}

// Safe hook to use toast helpers only if available
const useSafeToastHelpers = () => {
  try {
    return useToastHelpers();
  } catch {
    // Return a no-op implementation if ToastProvider is not available
    return {
      success: () => {},
      error: () => {},
      warning: () => {},
      info: () => {},
      default: () => {},
    };
  }
};

export const Form = <TFieldValues extends FieldValues = FieldValues>({
  schema,
  onSubmit,
  children,
  className,
  defaultValues,
  mode = 'onChange',
  resetOnSuccess = false,
  showSuccessMessage = true,
  successMessage = 'Form submitted successfully!',
  errorMessage = 'An error occurred while submitting the form.',
  submitButtonText = 'Submit',
  submitButtonVariant = 'primary',
  showSubmitButton = true,
  disabled = false,
  loading = false,
}: FormProps<TFieldValues>) => {
  const [formState, setFormState] = React.useState<FormState>('idle');
  const [serverErrors, setServerErrors] = React.useState<
    Record<string, string>
  >({});
  const toast = useSafeToastHelpers();

  const formMethods = useForm<TFieldValues>({
    resolver: schema ? zodResolver(schema as any) : undefined,
    defaultValues,
    mode,
  });

  const {
    handleSubmit,
    reset,
    setError,
    formState: { isSubmitting, isValid },
  } = formMethods;

  const handleFormSubmit: SubmitHandler<TFieldValues> = async data => {
    try {
      setFormState('submitting');
      setServerErrors({});

      const result = await onSubmit(data);

      // Handle different return types
      if (result && typeof result === 'object' && 'success' in result) {
        const submissionResult = result as FormSubmissionResult;

        if (submissionResult.success) {
          setFormState('success');
          if (resetOnSuccess) {
            reset();
          }
          if (showSuccessMessage) {
            toast.success(
              'Success!',
              submissionResult.message || successMessage
            );
          }
        } else {
          setFormState('error');
          if (submissionResult.errors) {
            // Set field-specific errors
            Object.entries(submissionResult.errors).forEach(
              ([field, message]) => {
                setError(field as any, { type: 'server', message });
              }
            );
            setServerErrors(submissionResult.errors);
          } else {
            toast.error('Error', submissionResult.message || errorMessage);
          }
        }
      } else {
        // Assume success if no specific result structure
        setFormState('success');
        if (resetOnSuccess) {
          reset();
        }
        if (showSuccessMessage) {
          toast.success('Success!', successMessage);
        }
      }
    } catch (error) {
      setFormState('error');
      console.error('Form submission error:', error);

      if (error instanceof Error) {
        toast.error('Error', error.message);
      } else {
        toast.error('Error', errorMessage);
      }
    } finally {
      // Reset form state after a delay
      setTimeout(() => setFormState('idle'), 2000);
    }
  };

  const isFormDisabled = disabled || loading || isSubmitting;
  const isFormSubmitting = formState === 'submitting' || isSubmitting;

  return (
    <FormProvider {...formMethods}>
      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        className={cn('space-y-6', className)}
        noValidate
      >
        {typeof children === 'function' ? children(formMethods) : children}

        {/* Server Errors Display */}
        {Object.keys(serverErrors).length > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <div className="flex">
              <Icon name="error" className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Please correct the following errors:
                </h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                  <ul className="list-disc space-y-1 pl-5">
                    {Object.entries(serverErrors).map(([field, message]) => (
                      <li key={field}>{message}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        {showSubmitButton && (
          <div className="flex justify-end">
            <Button
              type="submit"
              variant={submitButtonVariant}
              disabled={isFormDisabled || !isValid}
              isLoading={isFormSubmitting}
              leftIcon={
                formState === 'success' ? (
                  <Icon name="check" size="sm" color="success" />
                ) : formState === 'error' ? (
                  <Icon name="x" size="sm" color="error" />
                ) : undefined
              }
            >
              {isFormSubmitting
                ? 'Submitting...'
                : formState === 'success'
                  ? 'Success!'
                  : formState === 'error'
                    ? 'Try Again'
                    : submitButtonText}
            </Button>
          </div>
        )}
      </form>
    </FormProvider>
  );
};

// Form section wrapper for better organization
export const FormSection: React.FC<{
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ title, description, children, className }) => {
  return (
    <div className={cn('space-y-4', className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>
      )}
      <div className="space-y-4">{children}</div>
    </div>
  );
};

// Form grid for layout
export const FormGrid: React.FC<{
  columns?: 1 | 2 | 3 | 4;
  children: React.ReactNode;
  className?: string;
}> = ({ columns = 2, children, className }) => {
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn('grid gap-4', gridClasses[columns], className)}>
      {children}
    </div>
  );
};

// Form actions wrapper
export const FormActions: React.FC<{
  children: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}> = ({ children, align = 'right', className }) => {
  const alignClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  };

  return (
    <div className={cn('flex space-x-3', alignClasses[align], className)}>
      {children}
    </div>
  );
};
