import { AIError } from './types';

export class AIServiceError extends Error implements AIError {
  public readonly code: string;
  public readonly status?: number;
  public readonly provider?: string;
  public readonly retryable?: boolean;
  public readonly details?: any;
  public readonly cause?: Error;

  constructor(
    message: string,
    code: string,
    options: {
      status?: number;
      provider?: string;
      retryable?: boolean;
      details?: any;
      cause?: Error;
    } = {}
  ) {
    super(message);
    this.name = 'AIServiceError';
    this.code = code;
    this.status = options.status;
    this.provider = options.provider;
    this.retryable = options.retryable ?? false;
    this.details = options.details;

    if (options.cause) {
      this.cause = options.cause;
    }

    // Ensure proper prototype chain
    Object.setPrototypeOf(this, AIServiceError.prototype);
  }
}

export class RateLimitError extends AIServiceError {
  constructor(provider: string, retryAfter?: number) {
    super(
      `Rate limit exceeded for ${provider}${retryAfter ? `. Retry after ${retryAfter}s` : ''}`,
      'RATE_LIMIT_EXCEEDED',
      {
        status: 429,
        provider,
        retryable: true,
        details: { retryAfter }
      }
    );
    this.name = 'RateLimitError';
  }
}

export class AuthenticationError extends AIServiceError {
  constructor(provider: string, details?: any) {
    super(
      `Authentication failed for ${provider}`,
      'AUTHENTICATION_FAILED',
      {
        status: 401,
        provider,
        retryable: false,
        details
      }
    );
    this.name = 'AuthenticationError';
  }
}

export class QuotaExceededError extends AIServiceError {
  constructor(provider: string, details?: any) {
    super(
      `Quota exceeded for ${provider}`,
      'QUOTA_EXCEEDED',
      {
        status: 429,
        provider,
        retryable: false,
        details
      }
    );
    this.name = 'QuotaExceededError';
  }
}

export class ContentFilterError extends AIServiceError {
  constructor(provider: string, details?: any) {
    super(
      `Content filtered by ${provider}`,
      'CONTENT_FILTERED',
      {
        status: 400,
        provider,
        retryable: false,
        details
      }
    );
    this.name = 'ContentFilterError';
  }
}

export class ModelNotFoundError extends AIServiceError {
  constructor(provider: string, model: string) {
    super(
      `Model '${model}' not found for ${provider}`,
      'MODEL_NOT_FOUND',
      {
        status: 404,
        provider,
        retryable: false,
        details: { model }
      }
    );
    this.name = 'ModelNotFoundError';
  }
}

export class NetworkError extends AIServiceError {
  constructor(provider: string, cause?: Error) {
    super(
      `Network error for ${provider}`,
      'NETWORK_ERROR',
      {
        provider,
        retryable: true,
        cause
      }
    );
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends AIServiceError {
  constructor(provider: string, timeout: number) {
    super(
      `Request timeout for ${provider} after ${timeout}ms`,
      'TIMEOUT',
      {
        status: 408,
        provider,
        retryable: true,
        details: { timeout }
      }
    );
    this.name = 'TimeoutError';
  }
}

export class ValidationError extends AIServiceError {
  constructor(message: string, details?: any) {
    super(
      `Validation error: ${message}`,
      'VALIDATION_ERROR',
      {
        status: 400,
        retryable: false,
        details
      }
    );
    this.name = 'ValidationError';
  }
}

// Error mapping utilities
export function mapProviderError(error: any, provider: string): AIServiceError {
  if (error instanceof AIServiceError) {
    return error;
  }

  // OpenAI specific error mapping
  if (provider === 'openai') {
    if (error.status === 401) {
      return new AuthenticationError(provider, error.response?.data);
    }
    if (error.status === 429) {
      const retryAfter = error.response?.headers?.['retry-after'];
      if (error.response?.data?.error?.code === 'quota_exceeded') {
        return new QuotaExceededError(provider, error.response?.data);
      }
      return new RateLimitError(provider, retryAfter ? parseInt(retryAfter) : undefined);
    }
    if (error.status === 400 && error.response?.data?.error?.code === 'content_filter') {
      return new ContentFilterError(provider, error.response?.data);
    }
    if (error.status === 404) {
      return new ModelNotFoundError(provider, error.response?.data?.error?.param || 'unknown');
    }
  }

  // Hugging Face specific error mapping
  if (provider === 'huggingface') {
    if (error.status === 401) {
      return new AuthenticationError(provider, error.response?.data);
    }
    if (error.status === 429) {
      return new RateLimitError(provider);
    }
    if (error.status === 400) {
      return new ValidationError(error.message || 'Invalid request', error.response?.data);
    }
  }

  // Network and timeout errors
  if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND') {
    return new NetworkError(provider, error);
  }

  if (error.code === 'TIMEOUT') {
    return new TimeoutError(provider, error.timeout || 30000);
  }

  // Generic error
  return new AIServiceError(
    error.message || 'Unknown error occurred',
    'UNKNOWN_ERROR',
    {
      status: error.status,
      provider,
      retryable: error.status >= 500,
      details: error.response?.data || error
    }
  );
}

// Error handling middleware
export function createErrorHandler(provider: string) {
  return (error: any): never => {
    const aiError = mapProviderError(error, provider);
    
    // Log error for debugging
    console.error(`[${provider.toUpperCase()}] AI Service Error:`, {
      code: aiError.code,
      status: aiError.status,
      message: aiError.message,
      details: aiError.details,
      retryable: aiError.retryable
    });

    throw aiError;
  };
} 