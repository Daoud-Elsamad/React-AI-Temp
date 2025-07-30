import React from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { ToastProvider } from '@/components/ui';
import {
  Form,
  FormField,
  FormSection,
  FormGrid,
  PasswordField,
  EmailField,
} from '@/components/forms';
import {
  userRegistrationSchema,
  userLoginSchema,
  contactFormSchema,
  userProfileSchema,
  notificationSettingsSchema,
  UserRegistration,
  UserLogin,
  ContactForm,
  UserProfile,
  NotificationSettings,
} from '@/lib/validations';

const FormsShowcaseContent: React.FC = () => {
  // Registration Form Demo
  const handleRegistration = async (data: UserRegistration) => {
    console.log('Registration data:', data);
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Simulate different outcomes
    if (data.email === 'error@example.com') {
      return {
        success: false,
        message: 'Registration failed',
        errors: {
          email: 'This email is already registered',
        },
      };
    }

    return {
      success: true,
      message:
        'Account created successfully! Please check your email to verify your account.',
    };
  };

  // Login Form Demo
  const handleLogin = async (data: UserLogin) => {
    console.log('Login data:', data);
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (data.email === 'admin@example.com' && data.password === 'Password123') {
      return { success: true, message: 'Welcome back!' };
    } else {
      return {
        success: false,
        message: 'Invalid credentials',
        errors: {
          email: 'Invalid email or password',
        },
      };
    }
  };

  // Contact Form Demo
  const handleContact = async (data: ContactForm) => {
    console.log('Contact data:', data);
    await new Promise(resolve => setTimeout(resolve, 800));
    return {
      success: true,
      message: "Thank you for your message! We'll get back to you soon.",
    };
  };

  // Profile Form Demo
  const handleProfile = async (data: UserProfile) => {
    console.log('Profile data:', data);
    await new Promise(resolve => setTimeout(resolve, 1200));
    return { success: true, message: 'Profile updated successfully!' };
  };

  // Settings Form Demo
  const handleSettings = async (data: NotificationSettings) => {
    console.log('Settings data:', data);
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true, message: 'Notification preferences saved!' };
  };

  return (
    <PageWrapper
      title="Form System Showcase"
      subtitle="Comprehensive demonstration of the form system with validation, error handling, and submission states"
    >
      <div className="space-y-12">
        {/* User Registration Form */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              User Registration Form
            </h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Complete registration form with validation, password confirmation,
              and terms acceptance. Try "error@example.com" to see error
              handling.
            </p>
          </div>

          <div className="max-w-2xl bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <Form
              schema={userRegistrationSchema}
              onSubmit={handleRegistration}
              resetOnSuccess
              submitButtonText="Create Account"
            >
              <FormSection
                title="Personal Information"
                description="Please provide your basic information"
              >
                <FormGrid columns={2}>
                  <FormField
                    name="firstName"
                    label="First Name"
                    placeholder="Enter your first name"
                    required
                  />
                  <FormField
                    name="lastName"
                    label="Last Name"
                    placeholder="Enter your last name"
                    required
                  />
                </FormGrid>

                <EmailField
                  name="email"
                  label="Email Address"
                  placeholder="Enter your email"
                  required
                />

                <FormField
                  name="phone"
                  type="tel"
                  label="Phone Number"
                  placeholder="+1 (555) 123-4567"
                  description="Optional: We'll only use this for account security"
                />
              </FormSection>

              <FormSection
                title="Account Security"
                description="Choose a strong password for your account"
              >
                <PasswordField
                  name="password"
                  label="Password"
                  placeholder="Create a strong password"
                  required
                />

                <PasswordField
                  name="confirmPassword"
                  label="Confirm Password"
                  placeholder="Confirm your password"
                  required
                />
              </FormSection>

              <FormSection title="Terms & Conditions">
                <FormField
                  name="agreeToTerms"
                  variant="checkbox"
                  label="I agree to the Terms of Service and Privacy Policy"
                  required
                />
              </FormSection>
            </Form>
          </div>
        </section>

        {/* Login Form */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Login Form
            </h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Simple login form with remember me option. Try "admin@example.com"
              with password "Password123" for success.
            </p>
          </div>

          <div className="max-w-md bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <Form
              schema={userLoginSchema}
              onSubmit={handleLogin}
              submitButtonText="Sign In"
              defaultValues={{ rememberMe: false }}
            >
              <EmailField
                name="email"
                label="Email"
                placeholder="Enter your email"
                required
              />

              <PasswordField
                name="password"
                label="Password"
                placeholder="Enter your password"
                required
              />

              <FormField
                name="rememberMe"
                variant="checkbox"
                label="Remember me for 30 days"
              />
            </Form>
          </div>
        </section>

        {/* Contact Form */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Contact Form
            </h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Contact form with message priority and department selection.
            </p>
          </div>

          <div className="max-w-2xl bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <Form
              schema={contactFormSchema}
              onSubmit={handleContact}
              resetOnSuccess
              submitButtonText="Send Message"
            >
              <FormGrid columns={2}>
                <FormField
                  name="name"
                  label="Full Name"
                  placeholder="Enter your name"
                  required
                />

                <EmailField
                  name="email"
                  label="Email Address"
                  placeholder="your@email.com"
                  required
                />
              </FormGrid>

              <FormField
                name="subject"
                label="Subject"
                placeholder="What is this about?"
                required
              />

              <FormGrid columns={2}>
                <FormField
                  name="department"
                  variant="select"
                  label="Department"
                  placeholder="Select department"
                  options={[
                    { value: 'sales', label: 'Sales' },
                    { value: 'support', label: 'Technical Support' },
                    { value: 'general', label: 'General Inquiry' },
                  ]}
                />

                <FormField
                  name="priority"
                  variant="select"
                  label="Priority"
                  placeholder="Select priority"
                  options={[
                    { value: 'low', label: 'Low' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'high', label: 'High' },
                  ]}
                />
              </FormGrid>

              <FormField
                name="message"
                variant="textarea"
                label="Message"
                placeholder="Tell us more about your inquiry..."
                rows={5}
                required
              />
            </Form>
          </div>
        </section>

        {/* Profile Form */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Profile Settings
            </h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              User profile form with optional fields and social links.
            </p>
          </div>

          <div className="max-w-2xl bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <Form
              schema={userProfileSchema}
              onSubmit={handleProfile}
              submitButtonText="Update Profile"
              defaultValues={{
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                company: 'Acme Corp',
                jobTitle: 'Software Developer',
              }}
            >
              <FormSection
                title="Basic Information"
                description="Your basic profile information"
              >
                <FormGrid columns={2}>
                  <FormField
                    name="firstName"
                    label="First Name"
                    placeholder="First name"
                    required
                  />
                  <FormField
                    name="lastName"
                    label="Last Name"
                    placeholder="Last name"
                    required
                  />
                </FormGrid>

                <EmailField name="email" label="Email Address" required />

                <FormField
                  name="phone"
                  type="tel"
                  label="Phone Number"
                  placeholder="+1 (555) 123-4567"
                />
              </FormSection>

              <FormSection
                title="Professional Information"
                description="Information about your work and background"
              >
                <FormGrid columns={2}>
                  <FormField
                    name="company"
                    label="Company"
                    placeholder="Your company"
                  />
                  <FormField
                    name="jobTitle"
                    label="Job Title"
                    placeholder="Your role"
                  />
                </FormGrid>

                <FormField
                  name="location"
                  label="Location"
                  placeholder="City, Country"
                />

                <FormField
                  name="website"
                  type="url"
                  label="Website"
                  placeholder="https://your-website.com"
                />

                <FormField
                  name="bio"
                  variant="textarea"
                  label="Bio"
                  placeholder="Tell us about yourself..."
                  rows={4}
                  description="Brief description about yourself (max 500 characters)"
                />
              </FormSection>
            </Form>
          </div>
        </section>

        {/* Notification Settings */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Notification Settings
            </h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Form with multiple checkbox fields for notification preferences.
            </p>
          </div>

          <div className="max-w-xl bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <Form
              schema={notificationSettingsSchema}
              onSubmit={handleSettings}
              submitButtonText="Save Preferences"
              defaultValues={{
                emailNotifications: true,
                pushNotifications: true,
                smsNotifications: false,
                marketingEmails: false,
                weeklyDigest: true,
                newFeatures: true,
              }}
            >
              <FormSection
                title="Communication Preferences"
                description="Choose how you'd like to receive notifications"
              >
                <div className="space-y-4">
                  <FormField
                    name="emailNotifications"
                    variant="checkbox"
                    label="Email notifications"
                    description="Receive important updates via email"
                  />

                  <FormField
                    name="pushNotifications"
                    variant="checkbox"
                    label="Push notifications"
                    description="Get instant notifications on your device"
                  />

                  <FormField
                    name="smsNotifications"
                    variant="checkbox"
                    label="SMS notifications"
                    description="Receive critical alerts via text message"
                  />
                </div>
              </FormSection>

              <FormSection
                title="Marketing & Updates"
                description="Stay informed about new features and promotions"
              >
                <div className="space-y-4">
                  <FormField
                    name="marketingEmails"
                    variant="checkbox"
                    label="Marketing emails"
                    description="Receive promotional content and special offers"
                  />

                  <FormField
                    name="weeklyDigest"
                    variant="checkbox"
                    label="Weekly digest"
                    description="Get a summary of your activity and updates"
                  />

                  <FormField
                    name="newFeatures"
                    variant="checkbox"
                    label="New feature announcements"
                    description="Be the first to know about new features"
                  />
                </div>
              </FormSection>
            </Form>
          </div>
        </section>
      </div>
    </PageWrapper>
  );
};

export const FormsShowcasePage: React.FC = () => {
  return (
    <ToastProvider>
      <FormsShowcaseContent />
    </ToastProvider>
  );
};
