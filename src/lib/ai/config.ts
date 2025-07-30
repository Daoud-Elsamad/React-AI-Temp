import { AIServiceConfig, RateLimitConfig, CacheConfig } from './types';

/**
 * Default configuration for AI services
 */
export const DEFAULT_AI_CONFIG: AIServiceConfig = {
  rateLimit: {
    maxRequests: parseInt(import.meta.env.VITE_AI_RATE_LIMIT_REQUESTS) || 60,
    interval: parseInt(import.meta.env.VITE_AI_RATE_LIMIT_INTERVAL) || 60000, // 1 minute
    minTime: 1000 // 1 second minimum between requests
  },
  cache: {
    ttl: parseInt(import.meta.env.VITE_AI_CACHE_TTL) || 300000, // 5 minutes
    maxSize: 1000,
    enabled: true
  },
  timeout: 30000, // 30 seconds
  retries: 3,
  retryDelay: 1000 // 1 second
};

/**
 * Development configuration with more lenient settings
 */
export const DEV_AI_CONFIG: AIServiceConfig = {
  ...DEFAULT_AI_CONFIG,
  rateLimit: {
    maxRequests: 100,
    interval: 60000,
    minTime: 500
  },
  cache: {
    ttl: 60000, // 1 minute for faster development
    maxSize: 500,
    enabled: true
  },
  timeout: 60000, // 1 minute for development
  retries: 1,
  retryDelay: 500
};

/**
 * Production configuration with stricter limits
 */
export const PROD_AI_CONFIG: AIServiceConfig = {
  ...DEFAULT_AI_CONFIG,
  rateLimit: {
    maxRequests: 30,
    interval: 60000,
    minTime: 2000
  },
  cache: {
    ttl: 600000, // 10 minutes
    maxSize: 2000,
    enabled: true
  },
  timeout: 20000, // 20 seconds
  retries: 5,
  retryDelay: 2000
};

/**
 * Get configuration based on environment
 */
export function getAIConfig(): AIServiceConfig {
  const env = import.meta.env.VITE_NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      return PROD_AI_CONFIG;
    case 'development':
      return DEV_AI_CONFIG;
    default:
      return DEFAULT_AI_CONFIG;
  }
}

/**
 * Merge custom configuration with defaults
 */
export function mergeAIConfig(customConfig: Partial<AIServiceConfig>): AIServiceConfig {
  const baseConfig = getAIConfig();
  
  return {
    ...baseConfig,
    ...customConfig,
    rateLimit: {
      ...baseConfig.rateLimit,
      ...(customConfig.rateLimit || {})
    },
    cache: {
      ...baseConfig.cache,
      ...(customConfig.cache || {})
    }
  };
}

/**
 * Validate configuration values
 */
export function validateAIConfig(config: AIServiceConfig): void {
  if (config.rateLimit.maxRequests <= 0) {
    throw new Error('Rate limit maxRequests must be greater than 0');
  }
  
  if (config.rateLimit.interval <= 0) {
    throw new Error('Rate limit interval must be greater than 0');
  }
  
  if (config.cache.ttl <= 0) {
    throw new Error('Cache TTL must be greater than 0');
  }
  
  if (config.timeout <= 0) {
    throw new Error('Timeout must be greater than 0');
  }
  
  if (config.retries < 0) {
    throw new Error('Retries must be 0 or greater');
  }
  
  if (config.retryDelay <= 0) {
    throw new Error('Retry delay must be greater than 0');
  }
}

/**
 * Create rate limit configuration for different tiers
 */
export function createRateLimitConfig(tier: 'free' | 'basic' | 'premium' | 'enterprise'): RateLimitConfig {
  switch (tier) {
    case 'free':
      return {
        maxRequests: 10,
        interval: 60000,
        minTime: 5000
      };
    case 'basic':
      return {
        maxRequests: 30,
        interval: 60000,
        minTime: 2000
      };
    case 'premium':
      return {
        maxRequests: 100,
        interval: 60000,
        minTime: 1000
      };
    case 'enterprise':
      return {
        maxRequests: 1000,
        interval: 60000,
        minTime: 100
      };
    default:
      return DEFAULT_AI_CONFIG.rateLimit;
  }
}

/**
 * Create cache configuration for different use cases
 */
export function createCacheConfig(useCase: 'development' | 'production' | 'testing' | 'disabled'): CacheConfig {
  switch (useCase) {
    case 'development':
      return {
        ttl: 60000, // 1 minute
        maxSize: 100,
        enabled: true
      };
    case 'production':
      return {
        ttl: 600000, // 10 minutes
        maxSize: 1000,
        enabled: true
      };
    case 'testing':
      return {
        ttl: 1000, // 1 second
        maxSize: 10,
        enabled: true
      };
    case 'disabled':
      return {
        ttl: 0,
        maxSize: 0,
        enabled: false
      };
    default:
      return DEFAULT_AI_CONFIG.cache;
  }
} 