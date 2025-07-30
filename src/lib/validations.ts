import { z } from 'zod';
import { secureValidationSchemas, SQLSanitizer, InputSanitizer } from './security';

// Common validation patterns
export const requiredString = (message = 'This field is required') =>
  z.string().min(1, message);

export const optionalString = z.string().optional();

// Enhanced secure email validation
export const emailSchema = secureValidationSchemas.secureEmail;

// Enhanced secure password validation
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain at least one uppercase letter, one lowercase letter, and one number'
  )
  .refine(
    (val) => !SQLSanitizer.containsSQLInjection(val),
    'Password contains invalid characters'
  );

// Enhanced phone validation
export const phoneSchema = z
  .string()
  .regex(/^[+]?[1-9][\d\s\-\(\)]{8,20}$/, 'Please enter a valid phone number')
  .transform((val) => InputSanitizer.sanitizeText(val, { maxLength: 25 }));

// Enhanced URL validation
export const urlSchema = secureValidationSchemas.secureURL;

// Secure text field with XSS protection
export const secureTextField = (maxLength = 1000) => 
  secureValidationSchemas.secureText(maxLength);

// Secure HTML content field
export const secureHTMLField = (maxLength = 5000, strict = false) =>
  secureValidationSchemas.secureHTML(maxLength, strict);

// User-related schemas with enhanced security
export const userRegistrationSchema = z
  .object({
    firstName: secureTextField(50).refine(val => val.length >= 2, 'First name must be at least 2 characters'),
    lastName: secureTextField(50).refine(val => val.length >= 2, 'Last name must be at least 2 characters'),
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
  firstName: secureTextField(50).refine(val => val.length >= 2, 'First name must be at least 2 characters'),
  lastName: secureTextField(50).refine(val => val.length >= 2, 'Last name must be at least 2 characters'),
  email: emailSchema,
  phone: phoneSchema.optional(),
  bio: secureTextField(500),
  website: urlSchema.optional(),
  location: secureTextField(100),
  company: secureTextField(100),
  jobTitle: secureTextField(100),
});

// Enhanced contact form schema with security
export const contactFormSchema = z.object({
  name: secureTextField(100).refine(val => val.length >= 2, 'Name must be at least 2 characters'),
  email: emailSchema,
  subject: secureTextField(200).refine(val => val.length >= 5, 'Subject must be at least 5 characters'),
  message: secureTextField(2000).refine(val => val.length >= 10, 'Message must be at least 10 characters'),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  department: z.enum(['sales', 'support', 'general']).optional(),
});

// Enhanced product schema with security
export const productSchema = z.object({
  name: secureTextField(200).refine(val => val.length >= 3, 'Product name must be at least 3 characters'),
  description: secureHTMLField(1000).refine(val => val.length >= 20, 'Description must be at least 20 characters'),
  price: secureValidationSchemas.secureNumber(0, 999999).refine(val => val !== null, 'Price must be a valid number'),
  category: secureTextField(100),
  tags: z.array(secureTextField(50)).optional(),
  inStock: z.boolean(),
  images: z.array(urlSchema).optional(),
});

// Enhanced blog post schema with security
export const blogPostSchema = z.object({
  title: secureTextField(300).refine(val => val.length >= 5, 'Title must be at least 5 characters'),
  content: secureHTMLField(10000).refine(val => val.length >= 100, 'Content must be at least 100 characters'),
  excerpt: secureTextField(200),
  category: secureTextField(100),
  tags: z.array(secureTextField(50)).optional(),
  published: z.boolean(),
  publishDate: z.date().optional(),
  featuredImage: urlSchema.optional(),
});

// Settings schemas with enhanced security
export const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  smsNotifications: z.boolean(),
  marketingEmails: z.boolean(),
  weeklyDigest: z.boolean(),
  newFeatures: z.boolean(),
});

export const accountSettingsSchema = z.object({
  displayName: secureTextField(100).refine(val => val.length >= 2, 'Display name must be at least 2 characters'),
  email: emailSchema,
  timezone: secureTextField(50),
  language: z.enum(['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh']),
  theme: z.enum(['light', 'dark', 'auto']),
  twoFactorEnabled: z.boolean(),
});

// Enhanced dynamic form schema with security
export const dynamicFormSchema = z.object({
  formTitle: secureTextField(200).refine(val => val.length >= 3, 'Form title must be at least 3 characters'),
  fields: z
    .array(
      z.object({
        id: z.string().regex(/^[a-zA-Z0-9_-]+$/, 'Field ID must contain only alphanumeric characters, hyphens, and underscores'),
        type: z.enum([
          'text',
          'email',
          'number',
          'textarea',
          'select',
          'checkbox',
          'radio',
        ]),
        label: secureTextField(100).refine(val => val.length >= 1, 'Field label is required'),
        placeholder: secureTextField(200),
        required: z.boolean(),
        options: z.array(secureTextField(100)).optional(), // for select, radio
      })
    )
    .min(1, 'At least one field is required')
    .max(20, 'Maximum 20 fields allowed'),
});

// Enhanced file upload schema with security
export const fileUploadSchema = z.object({
  title: secureTextField(200).refine(val => val.length >= 3, 'Title must be at least 3 characters'),
  description: secureTextField(1000),
  files: z
    .array(
      z.object({
        name: secureValidationSchemas.secureFileName,
        size: secureValidationSchemas.secureNumber(1, 50 * 1024 * 1024), // Max 50MB
        type: z.string().regex(/^[a-zA-Z0-9\/\-_.]+$/, 'Invalid file type'),
      })
    )
    .min(1, 'At least one file is required')
    .max(10, 'Maximum 10 files allowed'),
  category: secureTextField(100),
  public: z.boolean(),
});

// Enhanced authentication schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z
  .object({
    name: secureTextField(100).refine(val => val.length >= 2, 'Name must be at least 2 characters'),
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
    token: z.string().min(1, 'Reset token is required').regex(/^[a-zA-Z0-9\-_]+$/, 'Invalid reset token format'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

// AI-specific secure schemas
export const aiPromptSchema = z.object({
  prompt: secureTextField(4000).refine(val => val.length >= 5, 'Prompt must be at least 5 characters'),
  systemMessage: secureTextField(1000),
  model: z.string().regex(/^[a-zA-Z0-9\-._]+$/, 'Invalid model name'),
  provider: z.enum(['openai', 'huggingface', 'anthropic']),
  maxTokens: secureValidationSchemas.secureNumber(1, 8000),
  temperature: secureValidationSchemas.secureNumber(0, 2),
  topP: secureValidationSchemas.secureNumber(0, 1),
});

export const conversationSchema = z.object({
  title: secureTextField(200).refine(val => val.length >= 1, 'Conversation title is required'),
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: secureTextField(8000),
    timestamp: z.date(),
  })).max(100, 'Maximum 100 messages per conversation'),
  systemMessage: secureTextField(1000),
  provider: z.enum(['openai', 'huggingface', 'anthropic']),
  model: z.string().regex(/^[a-zA-Z0-9\-._]+$/, 'Invalid model name'),
});

// API key validation schema
export const apiKeySchema = z.object({
  provider: z.enum(['openai', 'huggingface', 'anthropic']),
  apiKey: z.string()
    .min(10, 'API key is too short')
    .max(500, 'API key is too long')
    .refine(
      (val) => !SQLSanitizer.containsSQLInjection(val),
      'API key contains invalid characters'
    )
    .refine(
      (val) => /^[a-zA-Z0-9\-._]+$/.test(val),
      'API key contains invalid characters'
    ),
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
export type AIPrompt = z.infer<typeof aiPromptSchema>;
export type Conversation = z.infer<typeof conversationSchema>;
export type APIKey = z.infer<typeof apiKeySchema>;
