// Main AI Service
export { AIService, aiService } from './aiService';

// Types and Interfaces
export type {
  AIProvider,
  AIProviderType,
  ProviderConfig,
  AIServiceConfig,
  GenerateOptions,
  ImageGenerateOptions,
  ChatMessage,
  AIResponse,
  EmbeddingResponse,
  ImageResponse,
  RateLimitConfig,
  CacheConfig,
  AIError,
  ProviderCapabilities,
  ModelInfo,
  CacheEntry
} from './types';

// Individual Providers
export { OpenAIProvider } from './providers/openai';
export { HuggingFaceProvider } from './providers/huggingface';

// Base Classes and Utilities
export { BaseAIService } from './baseService';
export { AICache } from './cache';
export { RateLimiter } from './rateLimiter';

// Error Classes
export {
  AIServiceError,
  RateLimitError,
  AuthenticationError,
  QuotaExceededError,
  ContentFilterError,
  ModelNotFoundError,
  NetworkError,
  TimeoutError,
  ValidationError,
  mapProviderError,
  createErrorHandler
} from './errors';

// Configuration
export {
  getAIConfig,
  mergeAIConfig,
  validateAIConfig,
  createRateLimitConfig,
  createCacheConfig,
  DEFAULT_AI_CONFIG,
  DEV_AI_CONFIG,
  PROD_AI_CONFIG
} from './config'; 