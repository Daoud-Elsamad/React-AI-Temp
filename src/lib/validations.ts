import { z } from 'zod';

// Common validation patterns
export const requiredString = (message = 'This field is required') =>
  z.string().min(1, message);

export const optionalString = z.string().optional();

export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain at least one uppercase letter, one lowercase letter, and one number'
  );

export const phoneSchema = z
  .string()
  .regex(/^[+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number');

export const urlSchema = z.string().url('Please enter a valid URL');

// User-related schemas
export const userRegistrationSchema = z
  .object({
    firstName: requiredString('First name is required'),
    lastName: requiredString('Last name is required'),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: requiredString('Please confirm your password'),
    phone: phoneSchema.optional(),
    dateOfBirth: z.date().optional(),
    agreeToTerms: z.boolean().refine(val => val === true, {
      message: 'You must agree to the terms and conditions',
    }),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const userLoginSchema = z.object({
  email: emailSchema,
  password: requiredString('Password is required'),
  rememberMe: z.boolean().optional(),
});

export const userProfileSchema = z.object({
  firstName: requiredString('First name is required'),
  lastName: requiredString('Last name is required'),
  email: emailSchema,
  phone: phoneSchema.optional(),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  website: urlSchema.optional(),
  location: optionalString,
  company: optionalString,
  jobTitle: optionalString,
});

// Contact form schema
export const contactFormSchema = z.object({
  name: requiredString('Name is required'),
  email: emailSchema,
  subject: requiredString('Subject is required'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  department: z.enum(['sales', 'support', 'general']).optional(),
});

// Product/Content schemas
export const productSchema = z.object({
  name: requiredString('Product name is required'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  price: z.number().min(0, 'Price must be positive'),
  category: requiredString('Category is required'),
  tags: z.array(z.string()).optional(),
  inStock: z.boolean(),
  images: z.array(z.string().url()).optional(),
});

export const blogPostSchema = z.object({
  title: requiredString('Title is required'),
  content: z.string().min(100, 'Content must be at least 100 characters'),
  excerpt: z
    .string()
    .max(200, 'Excerpt must be less than 200 characters')
    .optional(),
  category: requiredString('Category is required'),
  tags: z.array(z.string()).optional(),
  published: z.boolean(),
  publishDate: z.date().optional(),
  featuredImage: urlSchema.optional(),
});

// Settings schemas
export const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  smsNotifications: z.boolean(),
  marketingEmails: z.boolean(),
  weeklyDigest: z.boolean(),
  newFeatures: z.boolean(),
});

export const accountSettingsSchema = z.object({
  displayName: requiredString('Display name is required'),
  email: emailSchema,
  timezone: requiredString('Timezone is required'),
  language: requiredString('Language is required'),
  theme: z.enum(['light', 'dark', 'auto']),
  twoFactorEnabled: z.boolean(),
});

// Advanced form schema with dynamic fields
export const dynamicFormSchema = z.object({
  formTitle: requiredString('Form title is required'),
  fields: z
    .array(
      z.object({
        id: z.string(),
        type: z.enum([
          'text',
          'email',
          'number',
          'textarea',
          'select',
          'checkbox',
          'radio',
        ]),
        label: requiredString('Field label is required'),
        placeholder: optionalString,
        required: z.boolean(),
        options: z.array(z.string()).optional(), // for select, radio
      })
    )
    .min(1, 'At least one field is required'),
});

// File upload schema
export const fileUploadSchema = z.object({
  title: requiredString('Title is required'),
  description: optionalString,
  files: z
    .array(
      z.object({
        name: z.string(),
        size: z.number(),
        type: z.string(),
      })
    )
    .min(1, 'At least one file is required'),
  category: requiredString('Category is required'),
  public: z.boolean(),
});

// Authentication schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z
  .object({
    name: requiredString('Name is required').min(
      2,
      'Name must be at least 2 characters'
    ),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmNewPassword: z.string(),
  })
  .refine(data => data.newPassword === data.confirmNewPassword, {
    message: "Passwords don't match",
    path: ['confirmNewPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Reset token is required'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

// Export types for TypeScript
export type UserRegistration = z.infer<typeof userRegistrationSchema>;
export type UserLogin = z.infer<typeof userLoginSchema>;
export type UserProfile = z.infer<typeof userProfileSchema>;
export type ContactForm = z.infer<typeof contactFormSchema>;
export type Product = z.infer<typeof productSchema>;
export type BlogPost = z.infer<typeof blogPostSchema>;
export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;
export type AccountSettings = z.infer<typeof accountSettingsSchema>;
export type DynamicForm = z.infer<typeof dynamicFormSchema>;
export type FileUpload = z.infer<typeof fileUploadSchema>;
