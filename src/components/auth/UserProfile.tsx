import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdateProfile } from '@/hooks/useAuthApi';
import { userProfileSchema } from '@/lib/validations';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

interface UserProfileProps {
  onPasswordChangeClick?: () => void;
}

export function UserProfile({ onPasswordChangeClick }: UserProfileProps) {
  const { user } = useAuth();
  const { updateProfile, isLoading, error, clearError } = useUpdateProfile();
  const { addToast } = useToast();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    bio: '',
    website: '',
    location: '',
    company: '',
    jobTitle: '',
  });
  
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  // Initialize form data from user
  useEffect(() => {
    if (user) {
      // Split user.name into firstName and lastName
      const nameParts = user.name?.split(' ') || [''];
      setFormData({
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: user.email || '',
        phone: '',
        bio: '',
        website: '',
        location: '',
        company: '',
        jobTitle: '',
      });
    }
  }, [user]);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
      userProfileSchema.parse(formData);
      setValidationErrors({});
    } catch (err: any) {
      const errors: Record<string, string> = {};
      err.errors?.forEach((error: any) => {
        errors[error.path[0]] = error.message;
      });
      setValidationErrors(errors);
      return;
    }

    // Attempt to update profile
    const success = await updateProfile(formData);
    if (success) {
      addToast({
        description: 'Profile updated successfully!',
        variant: 'success',
        duration: 5000,
      });
    }
  };

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 dark:text-gray-400">
          Please log in to view your profile.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">
          Your Profile
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Manage your account information and preferences.
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Basic Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                First Name
              </label>
              <Input
                id="firstName"
                name="firstName"
                type="text"
                required
                placeholder="First name"
                value={formData.firstName}
                onChange={handleInputChange}
                error={
                  validationErrors.firstName ||
                  (error?.field === 'firstName' ? error.message : '')
                }
              />
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Last Name
              </label>
              <Input
                id="lastName"
                name="lastName"
                type="text"
                required
                placeholder="Last name"
                value={formData.lastName}
                onChange={handleInputChange}
                error={
                  validationErrors.lastName ||
                  (error?.field === 'lastName' ? error.message : '')
                }
              />
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email Address
            </label>
            <Input
              id="email"
              name="email"
              type="email"
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

          <div className="mt-4">
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Phone Number (Optional)
            </label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="Phone number"
              value={formData.phone}
              onChange={handleInputChange}
              error={
                validationErrors.phone ||
                (error?.field === 'phone' ? error.message : '')
              }
            />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Professional Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="company" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Company (Optional)
              </label>
              <Input
                id="company"
                name="company"
                type="text"
                placeholder="Company name"
                value={formData.company}
                onChange={handleInputChange}
                error={
                  validationErrors.company ||
                  (error?.field === 'company' ? error.message : '')
                }
              />
            </div>

            <div>
              <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Job Title (Optional)
              </label>
              <Input
                id="jobTitle"
                name="jobTitle"
                type="text"
                placeholder="Job title"
                value={formData.jobTitle}
                onChange={handleInputChange}
                error={
                  validationErrors.jobTitle ||
                  (error?.field === 'jobTitle' ? error.message : '')
                }
              />
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Location (Optional)
            </label>
            <Input
              id="location"
              name="location"
              type="text"
              placeholder="City, Country"
              value={formData.location}
              onChange={handleInputChange}
              error={
                validationErrors.location ||
                (error?.field === 'location' ? error.message : '')
              }
            />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Additional Information
          </h3>

          <div className="mt-4">
            <label htmlFor="website" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Website (Optional)
            </label>
            <Input
              id="website"
              name="website"
              type="url"
              placeholder="https://example.com"
              value={formData.website}
              onChange={handleInputChange}
              error={
                validationErrors.website ||
                (error?.field === 'website' ? error.message : '')
              }
            />
          </div>

          <div className="mt-4">
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Bio (Optional)
            </label>
            <textarea
              id="bio"
              name="bio"
              rows={4}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Tell us about yourself..."
              value={formData.bio}
              onChange={handleInputChange}
            />
            {validationErrors.bio && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {validationErrors.bio}
              </p>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Security
          </h3>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Password
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Change your password to keep your account secure.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={onPasswordChangeClick}
            >
              Change Password
            </Button>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            disabled={isLoading}
          >
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
} 