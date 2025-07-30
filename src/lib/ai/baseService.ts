import { 
  AIProvider, 
  AIResponse, 
  ChatMessage, 
  GenerateOptions, 
  EmbeddingResponse, 
  ImageResponse, 
  ImageGenerateOptions,
  AIServiceConfig,
  ProviderConfig
} from './types';
import { SimpleCache as AICache } from './simpleCache';
import { RateLimiter } from './rateLimiter';
import { createErrorHandler, AIServiceError } from './errors';

export abstract class BaseAIService implements AIProvider {
  public abstract readonly name: string;
  public readonly id: string;

  protected config: ProviderConfig;
  protected serviceConfig: AIServiceConfig;
  protected cache: AICache;
  protected rateLimiter: RateLimiter;
  protected errorHandler: (error: any) => never;

  constructor(
    id: string,
    config: ProviderConfig,
    serviceConfig: AIServiceConfig
  ) {
    this.id = id;
    this.config = config;
    this.serviceConfig = serviceConfig;
    this.cache = new AICache(serviceConfig.cache);
    this.rateLimiter = new RateLimiter(serviceConfig.rateLimit);
    this.errorHandler = createErrorHandler(this.id);
  }

  /**
   * Execute a request with rate limiting, caching, and error handling
   */
  protected async executeWithMiddleware<T>(
    method: string,
    params: Record<string, any>,
    executor: () => Promise<T>,
    options: {
      cacheable?: boolean;
      priority?: number;
      customCacheTtl?: number;
    } = {}
  ): Promise<T> {
    const { cacheable = true, priority = 5, customCacheTtl } = options;

    // Check cache first
    if (cacheable) {
      const cached = this.cache.get<T>(this.id, method, params);
      if (cached) {
        return cached;
      }
    }

    try {
      // Execute with rate limiting
      const result = await this.rateLimiter.execute(
        this.id,
        executor,
        priority
      );

      // Cache the result
      if (cacheable && result) {
        this.cache.set(this.id, method, params, result, customCacheTtl);
      }

      return result;
    } catch (error) {
      this.errorHandler(error);
    }
  }

  /**
   * Retry logic with exponential backoff
   */
  protected async executeWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries = this.serviceConfig.retries,
    baseDelay = this.serviceConfig.retryDelay
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        // Don't retry if it's not a retryable error
        if (error instanceof AIServiceError && !error.retryable) {
          throw error;
        }

        // Don't retry on the last attempt
        if (attempt === maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = baseDelay * Math.pow(2, attempt);
        const jitter = Math.random() * 0.1 * delay; // Add 10% jitter
        const totalDelay = delay + jitter;

        console.warn(
          `[${this.id.toUpperCase()}] Attempt ${attempt + 1} failed, retrying in ${Math.round(totalDelay)}ms`,
          error.message
        );

        await new Promise(resolve => setTimeout(resolve, totalDelay));
      }
    }

    throw lastError;
  }

  /**
   * Validate input parameters
   */
  protected validateInput(params: Record<string, any>, requiredFields: string[]): void {
    for (const field of requiredFields) {
      if (params[field] === undefined || params[field] === null) {
        throw new AIServiceError(
          `Missing required field: ${field}`,
          'VALIDATION_ERROR',
          { provider: this.id, details: { field, params } }
        );
      }
    }
  }

  /**
   * Sanitize and prepare options
   */
  protected prepareOptions(options: GenerateOptions = {}): GenerateOptions {
    return {
      maxTokens: options.maxTokens || 1000,
      temperature: Math.max(0, Math.min(2, options.temperature || 0.7)),
      topP: Math.max(0, Math.min(1, options.topP || 1)),
      frequencyPenalty: Math.max(-2, Math.min(2, options.frequencyPenalty || 0)),
      presencePenalty: Math.max(-2, Math.min(2, options.presencePenalty || 0)),
      model: options.model || this.config.defaultModel,
      stream: options.stream || false,
      stopSequences: options.stopSequences || []
    };
  }

  /**
   * Abstract methods that must be implemented by concrete providers
   */
  abstract generateText(prompt: string, options?: GenerateOptions): Promise<AIResponse>;
  abstract generateChat(messages: ChatMessage[], options?: GenerateOptions): Promise<AIResponse>;
  abstract generateEmbedding?(text: string): Promise<EmbeddingResponse>;
  abstract generateImage?(prompt: string, options?: ImageGenerateOptions): Promise<ImageResponse>;

  /**
   * Get service status and statistics
   */
  getStatus() {
    return {
      provider: this.id,
      name: this.name,
      rateLimiter: this.rateLimiter.getStatus(this.id),
      cache: this.cache.getStats(),
      config: {
        timeout: this.serviceConfig.timeout,
        retries: this.serviceConfig.retries,
        retryDelay: this.serviceConfig.retryDelay
      }
    };
  }

  /**
   * Update service configuration
   */
  updateConfig(newConfig: Partial<AIServiceConfig>): void {
    this.serviceConfig = { ...this.serviceConfig, ...newConfig };
    
    if (newConfig.cache) {
      this.cache.updateConfig(newConfig.cache);
    }
    
    if (newConfig.rateLimit) {
      this.rateLimiter.updateConfig(newConfig.rateLimit);
    }
  }

  /**
   * Clear cache and rate limiter
   */
  reset(): void {
    this.cache.clear();
    this.rateLimiter.clearProvider(this.id);
  }
} 