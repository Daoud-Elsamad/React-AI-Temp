import { useState, useEffect } from 'react';
import { useRegister } from '@/hooks/useAuthApi';
import { registerSchema } from '@/lib/validations';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

interface RegisterFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export function RegisterForm({
  onSuccess,
  onSwitchToLogin,
}: RegisterFormProps) {
  const { register, isLoading, error, clearError } = useRegister();
  const { addToast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  // Show error toast when there's a general error
  useEffect(() => {
    if (error && !error.field) {
      addToast({
        description: error.message,
        variant: 'error',
        duration: 5000,
      });
    }
  }, [error, addToast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }

    // Clear auth error
    if (error) {
      clearError();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form data
    try {
      registerSchema.parse(formData);
      setValidationErrors({});
    } catch (err: any) {
      const errors: Record<string, string> = {};
      err.errors?.forEach((error: any) => {
        errors[error.path[0]] = error.message;
      });
      setValidationErrors(errors);
      return;
    }

    // Attempt registration
    const success = await register({
      name: formData.name,
      email: formData.email,
      password: formData.password,
    });

    if (success) {
      onSuccess?.();
    }
  };

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="text-center">
        <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
          Create your account
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Or{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
          >
            sign in to your existing account
          </button>
        </p>
      </div>

      <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="sr-only">
              Full Name
            </label>
            <Input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              placeholder="Full name"
              value={formData.name}
              onChange={handleInputChange}
              error={
                validationErrors.name ||
                (error?.field === 'name' ? error.message : '')
              }
            />
          </div>

          <div>
            <label htmlFor="email" className="sr-only">
              Email address
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="Email address"
              value={formData.email}
              onChange={handleInputChange}
              error={
                validationErrors.email ||
                (error?.field === 'email' ? error.message : '')
              }
            />
          </div>

          <div>
            <label htmlFor="password" className="sr-only">
              Password
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              placeholder="Password"
              value={formData.password}
              onChange={handleInputChange}
              error={
                validationErrors.password ||
                (error?.field === 'password' ? error.message : '')
              }
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="sr-only">
              Confirm Password
            </label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              placeholder="Confirm password"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              error={validationErrors.confirmPassword}
            />
          </div>
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-400">
          <p>
            By creating an account, you agree to our{' '}
            <a
              href="#"
              className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
            >
              Terms of Service
            </a>{' '}
            and{' '}
            <a
              href="#"
              className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
            >
              Privacy Policy
            </a>
            .
          </p>
        </div>

        <div>
          <Button
            type="submit"
            className="group relative w-full"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            disabled={isLoading}
          >
            Create account
          </Button>
        </div>

        {/* Error handling is done through useEffect */}
      </form>
    </div>
  );
}
