import * as Sentry from '@sentry/react';

// Error severity levels
export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  FATAL = 'fatal'
}

// Error types for better categorization
export enum ErrorType {
  NETWORK = 'network',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  PERMISSION = 'permission',
  APPLICATION = 'application',
  PERFORMANCE = 'performance',
  USER_INPUT = 'user_input'
}

// Error context interface
export interface ErrorContext {
  userId?: string;
  userAgent?: string;
  url?: string;
  component?: string;
  action?: string;
  timestamp?: Date;
  extra?: Record<string, any>;
  [key: string]: any; // Allow additional properties
}

// Enhanced error class
export class EnhancedError extends Error {
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly context: ErrorContext;
  public readonly originalError?: Error;

  constructor(
    message: string,
    type: ErrorType = ErrorType.APPLICATION,
    severity: ErrorSeverity = ErrorSeverity.ERROR,
    context: ErrorContext = {},
    originalError?: Error
  ) {
    super(message);
    this.name = 'EnhancedError';
    this.type = type;
    this.severity = severity;
    this.context = {
      ...context,
      timestamp: new Date(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };
    this.originalError = originalError;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, EnhancedError);
    }
  }
}

// Error tracking service
export class ErrorTrackingService {
  private static instance: ErrorTrackingService;
  private isInitialized = false;

  static getInstance(): ErrorTrackingService {
    if (!ErrorTrackingService.instance) {
      ErrorTrackingService.instance = new ErrorTrackingService();
    }
    return ErrorTrackingService.instance;
  }

  // Initialize Sentry
  initialize(dsn?: string, environment = 'development'): void {
    if (this.isInitialized) return;

    // Only initialize in production or if DSN is provided
    if (environment === 'production' || dsn) {
      Sentry.init({
        dsn: dsn || process.env.REACT_APP_SENTRY_DSN,
        environment,
        tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
        beforeSend: (event) => {
          // Filter out noisy errors in development
          if (environment === 'development') {
            const ignoredErrors = [
              'ChunkLoadError',
              'Loading chunk',
              'ResizeObserver loop limit exceeded'
            ];
            
            if (ignoredErrors.some(error => 
              event.exception?.values?.[0]?.value?.includes(error)
            )) {
              return null;
            }
          }
          return event;
        },
      });
    }

    this.isInitialized = true;
    this.setupGlobalErrorHandlers();
  }

  // Set up global error handlers
  private setupGlobalErrorHandlers(): void {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError(
        new EnhancedError(
          `Unhandled Promise Rejection: ${event.reason}`,
          ErrorType.APPLICATION,
          ErrorSeverity.ERROR,
          { reason: event.reason }
        )
      );
    });

    // Handle global JavaScript errors
    window.addEventListener('error', (event) => {
      this.captureError(
        new EnhancedError(
          event.message,
          ErrorType.APPLICATION,
          ErrorSeverity.ERROR,
          {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
          },
          event.error
        )
      );
    });
  }

  // Capture and track errors
  captureError(error: Error | EnhancedError, context?: ErrorContext): void {
    let enhancedError: EnhancedError;

    if (error instanceof EnhancedError) {
      enhancedError = error;
      if (context) {
        // Create new error with updated context since context is readonly
        enhancedError = new EnhancedError(
          error.message,
          error.type,
          error.severity,
          { ...error.context, ...context },
          error.originalError
        );
      }
    } else {
      enhancedError = new EnhancedError(
        error.message,
        ErrorType.APPLICATION,
        ErrorSeverity.ERROR,
        context,
        error
      );
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error captured:', enhancedError);
    }

    // Send to Sentry if initialized
    if (this.isInitialized) {
      Sentry.withScope((scope) => {
        scope.setTag('errorType', enhancedError.type);
        scope.setLevel(enhancedError.severity as any);
        scope.setContext('errorContext', enhancedError.context);
        
        if (enhancedError.context.userId) {
          scope.setUser({ id: enhancedError.context.userId });
        }

        Sentry.captureException(enhancedError.originalError || enhancedError);
      });
    }

    // Store in local storage for offline tracking
    this.storeErrorLocally(enhancedError);
  }

  // Store errors locally for offline scenarios
  private storeErrorLocally(error: EnhancedError): void {
    try {
      const storedErrors = JSON.parse(
        localStorage.getItem('stored_errors') || '[]'
      );
      
      storedErrors.push({
        message: error.message,
        type: error.type,
        severity: error.severity,
        context: error.context,
        stack: error.stack
      });

      // Keep only last 50 errors
      if (storedErrors.length > 50) {
        storedErrors.splice(0, storedErrors.length - 50);
      }

      localStorage.setItem('stored_errors', JSON.stringify(storedErrors));
    } catch (e) {
      console.warn('Failed to store error locally:', e);
    }
  }

  // Capture message with context
  captureMessage(
    message: string,
    level: ErrorSeverity = ErrorSeverity.INFO,
    context?: ErrorContext
  ): void {
    if (this.isInitialized) {
      Sentry.withScope((scope) => {
        scope.setLevel(level as any);
        if (context) {
          scope.setContext('messageContext', context);
        }
        Sentry.captureMessage(message);
      });
    }

    // Log to console
    console.log(`[${level.toUpperCase()}] ${message}`, context);
  }

  // Set user context
  setUser(user: { id: string; email?: string; username?: string }): void {
    if (this.isInitialized) {
      Sentry.setUser(user);
    }
  }

  // Add breadcrumb for tracking user actions
  addBreadcrumb(message: string, category = 'user', data?: any): void {
    if (this.isInitialized) {
      Sentry.addBreadcrumb({
        message,
        category,
        data,
        timestamp: Date.now() / 1000,
      });
    }
  }

  // Get stored errors (for debugging/reporting)
  getStoredErrors(): any[] {
    try {
      return JSON.parse(localStorage.getItem('stored_errors') || '[]');
    } catch {
      return [];
    }
  }

  // Clear stored errors
  clearStoredErrors(): void {
    localStorage.removeItem('stored_errors');
  }
}

// Export singleton instance
export const errorTracker = ErrorTrackingService.getInstance(); 