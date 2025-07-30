import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Icon } from './Icon';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  label?: string;
  helperText?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onChange?: (value: string) => void;
}

export const Select = React.forwardRef<HTMLDivElement, SelectProps>(
  ({
    options,
    value,
    defaultValue,
    placeholder = 'Select an option...',
    disabled = false,
    error,
    label,
    helperText,
    size = 'md',
    className,
    onChange,
    ...props
  }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedValue, setSelectedValue] = useState(value || defaultValue || '');
    const selectRef = useRef<HTMLDivElement>(null);

    const sizeClasses = {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4 text-sm',
      lg: 'h-12 px-4 text-base',
    };

    const selectedOption = options.find(option => option.value === selectedValue);

    useEffect(() => {
      if (value !== undefined) {
        setSelectedValue(value);
      }
    }, [value]);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleOptionSelect = (optionValue: string) => {
      setSelectedValue(optionValue);
      setIsOpen(false);
      onChange?.(optionValue);
    };

    const baseStyles = 'w-full rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100';
    
    const errorStyles = error
      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:focus:border-blue-400';

    return (
      <div className={cn('space-y-1', className)} ref={ref} {...props}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </label>
        )}
        
        <div className="relative" ref={selectRef}>
          <button
            type="button"
            className={cn(
              baseStyles,
              sizeClasses[size],
              errorStyles,
              'flex items-center justify-between cursor-pointer',
              disabled && 'cursor-not-allowed'
            )}
            onClick={() => !disabled && setIsOpen(!isOpen)}
            disabled={disabled}
          >
            <span className={cn(
              selectedOption ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'
            )}>
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            <Icon
              name="chevronDown"
              className={cn(
                'h-4 w-4 text-gray-400 transition-transform',
                isOpen && 'transform rotate-180'
              )}
            />
          </button>

          {isOpen && (
            <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800">
              <div className="max-h-60 overflow-auto">
                {options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={cn(
                      'w-full px-4 py-2 text-left text-sm transition-colors',
                      'hover:bg-gray-100 dark:hover:bg-gray-700',
                      'focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none',
                      selectedValue === option.value && 'bg-blue-50 text-blue-600 dark:bg-blue-900 dark:text-blue-300',
                      option.disabled && 'opacity-50 cursor-not-allowed'
                    )}
                    onClick={() => !option.disabled && handleOptionSelect(option.value)}
                    disabled={option.disabled}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        {helperText && !error && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select'; 