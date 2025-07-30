import React from 'react';
import { useFormContext, FieldPath, FieldValues } from 'react-hook-form';
import { Input, TextArea, Icon } from '@/components/ui';
import { cn } from '@/lib/utils';

export interface FormFieldProps<
  TFieldValues extends FieldValues = FieldValues,
> {
  name: FieldPath<TFieldValues>;
  label?: string;
  description?: string;
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';
  variant?: 'input' | 'textarea' | 'select' | 'checkbox' | 'radio';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  required?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  className?: string;
  rows?: number;
  options?: { value: string; label: string; disabled?: boolean }[];
  multiple?: boolean;
  showPasswordToggle?: boolean;
}

export const FormField = <TFieldValues extends FieldValues = FieldValues>({
  name,
  label,
  description,
  placeholder,
  type = 'text',
  variant = 'input',
  size = 'md',
  disabled = false,
  required = false,
  leftIcon,
  rightIcon,
  className,
  rows = 4,
  options = [],
  multiple = false,
  showPasswordToggle = false,
}: FormFieldProps<TFieldValues>) => {
  const {
    register,
    formState: { errors },
  } = useFormContext<TFieldValues>();

  const [showPassword, setShowPassword] = React.useState(false);
  const fieldError = errors[name];

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const getInputType = () => {
    if (type === 'password' && showPasswordToggle) {
      return showPassword ? 'text' : 'password';
    }
    return type;
  };

  const renderPasswordToggle = () => {
    if (type === 'password' && showPasswordToggle) {
      return (
        <button
          type="button"
          onClick={togglePasswordVisibility}
          className="text-gray-400 hover:text-gray-600"
        >
          <Icon name={showPassword ? 'eyeOff' : 'eye'} size="sm" />
        </button>
      );
    }
    return rightIcon;
  };

  const renderInput = () => {
    const commonProps = {
      ...register(name),
      disabled,
      placeholder,
      className: cn('transition-colors', className),
    };

    switch (variant) {
      case 'textarea':
        return (
          <TextArea
            {...commonProps}
            rows={rows}
            error={fieldError?.message as string}
            resize="vertical"
          />
        );

      case 'select':
        return (
          <select
            {...commonProps}
            multiple={multiple}
            className={cn(
              'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition-colors',
              'focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-blue-400',
              fieldError &&
                'border-red-300 focus:border-red-500 focus:ring-red-500',
              className
            )}
          >
            {!multiple && (
              <option value="">
                {placeholder || `Select ${label?.toLowerCase() || 'option'}`}
              </option>
            )}
            {options.map(option => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <input
              {...register(name)}
              type="checkbox"
              disabled={disabled}
              className={cn(
                'h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500',
                'disabled:cursor-not-allowed disabled:opacity-50',
                className
              )}
            />
            {label && (
              <label
                htmlFor={name}
                className={cn(
                  'text-sm font-medium text-gray-700 dark:text-gray-300',
                  disabled && 'opacity-50'
                )}
              >
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
              </label>
            )}
          </div>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            {options.map(option => (
              <div key={option.value} className="flex items-center space-x-2">
                <input
                  {...register(name)}
                  type="radio"
                  value={option.value}
                  disabled={disabled || option.disabled}
                  className={cn(
                    'h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500',
                    'disabled:cursor-not-allowed disabled:opacity-50'
                  )}
                />
                <label
                  className={cn(
                    'text-sm font-medium text-gray-700 dark:text-gray-300',
                    (disabled || option.disabled) && 'opacity-50'
                  )}
                >
                  {option.label}
                </label>
              </div>
            ))}
          </div>
        );

      default:
        return (
          <Input
            {...commonProps}
            type={getInputType()}
            leftIcon={leftIcon}
            rightIcon={renderPasswordToggle()}
            error={fieldError?.message as string}
            size={size}
          />
        );
    }
  };

  // For checkbox and radio, we render them differently
  if (variant === 'checkbox') {
    return (
      <div className="space-y-1">
        {renderInput()}
        {fieldError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {fieldError.message as string}
          </p>
        )}
        {description && !fieldError && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {description}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {label && (
        <label
          htmlFor={name}
          className={cn(
            'block text-sm font-medium text-gray-700 dark:text-gray-300',
            disabled && 'opacity-50'
          )}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {renderInput()}

      {fieldError && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {fieldError.message as string}
        </p>
      )}

      {description && !fieldError && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {description}
        </p>
      )}
    </div>
  );
};

// Specialized form field components
export const PasswordField = <TFieldValues extends FieldValues = FieldValues>(
  props: Omit<FormFieldProps<TFieldValues>, 'type' | 'showPasswordToggle'>
) => <FormField {...props} type="password" showPasswordToggle />;

export const EmailField = <TFieldValues extends FieldValues = FieldValues>(
  props: Omit<FormFieldProps<TFieldValues>, 'type'>
) => (
  <FormField
    {...props}
    type="email"
    leftIcon={<Icon name="user" size="sm" />}
  />
);

export const SearchField = <TFieldValues extends FieldValues = FieldValues>(
  props: Omit<FormFieldProps<TFieldValues>, 'type'>
) => (
  <FormField
    {...props}
    type="search"
    leftIcon={<Icon name="search" size="sm" />}
  />
);

export const PhoneField = <TFieldValues extends FieldValues = FieldValues>(
  props: Omit<FormFieldProps<TFieldValues>, 'type'>
) => <FormField {...props} type="tel" />;

export const UrlField = <TFieldValues extends FieldValues = FieldValues>(
  props: Omit<FormFieldProps<TFieldValues>, 'type'>
) => <FormField {...props} type="url" />;
