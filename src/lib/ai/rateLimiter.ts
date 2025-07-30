import Bottleneck from 'bottleneck';
import { RateLimitConfig } from './types';
import { RateLimitError } from './errors';

export class RateLimiter {
  private limiters: Map<string, Bottleneck> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /**
   * Get or create a rate limiter for a specific provider
   */
  private getLimiter(provider: string): Bottleneck {
    if (!this.limiters.has(provider)) {
      const limiter = new Bottleneck({
        reservoir: this.config.maxRequests,
        reservoirRefreshAmount: this.config.maxRequests,
        reservoirRefreshInterval: this.config.interval,
        minTime: this.config.minTime || 0,
        maxConcurrent: 5, // Allow up to 5 concurrent requests
        highWater: 100, // Queue up to 100 requests
        strategy: Bottleneck.strategy.LEAK
      });

      // Handle dropped requests
      limiter.on('dropped', (dropped) => {
        console.warn(`[${provider.toUpperCase()}] Rate limiter dropped request:`, dropped);
      });

      // Handle depleted reservoir
      limiter.on('depleted', () => {
        console.warn(`[${provider.toUpperCase()}] Rate limit reservoir depleted`);
      });

      // Handle failures
      limiter.on('failed', (error, jobInfo) => {
        console.error(`[${provider.toUpperCase()}] Rate limiter job failed:`, error, jobInfo);
      });

      this.limiters.set(provider, limiter);
    }

    return this.limiters.get(provider)!;
  }

  /**
   * Execute a function with rate limiting
   */
  async execute<T>(
    provider: string,
    fn: () => Promise<T>,
    priority = 5
  ): Promise<T> {
    const limiter = this.getLimiter(provider);

    try {
      return await limiter.schedule(
        { priority, weight: 1 },
        fn
      );
    } catch (error: any) {
      // Check if it's a rate limit error from the limiter itself
      if (error.message && error.message.includes('too many requests')) {
        throw new RateLimitError(provider);
      }
      throw error;
    }
  }

  /**
   * Check current status of rate limiter for a provider
   */
  getStatus(provider: string) {
    const limiter = this.limiters.get(provider);
    if (!limiter) {
      return {
        running: 0,
        queued: 0,
        reservoir: this.config.maxRequests,
        available: this.config.maxRequests
      };
    }

    return {
      running: limiter.running(),
      queued: limiter.queued(),
      reservoir: (limiter as any).reservoir || this.config.maxRequests,
      available: (limiter as any).available || this.config.maxRequests
    };
  }

  /**
   * Update rate limit configuration for all providers
   */
  updateConfig(newConfig: Partial<RateLimitConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Update existing limiters
    this.limiters.forEach((limiter) => {
      if (newConfig.maxRequests !== undefined) {
        limiter.updateSettings({
          reservoir: newConfig.maxRequests,
          reservoirRefreshAmount: newConfig.maxRequests
        });
      }
      
      if (newConfig.interval !== undefined) {
        limiter.updateSettings({
          reservoirRefreshInterval: newConfig.interval
        });
      }
      
      if (newConfig.minTime !== undefined) {
        limiter.updateSettings({
          minTime: newConfig.minTime
        });
      }
    });
  }

  /**
   * Clear rate limiter for a specific provider
   */
  clearProvider(provider: string): void {
    const limiter = this.limiters.get(provider);
    if (limiter) {
      limiter.stop();
      this.limiters.delete(provider);
    }
  }

  /**
   * Clear all rate limiters
   */
  clearAll(): void {
    this.limiters.forEach((limiter) => {
      limiter.stop();
    });
    this.limiters.clear();
  }

  /**
   * Get statistics for all providers
   */
  getAllStats() {
    const stats: Record<string, any> = {};
    this.limiters.forEach((_, provider) => {
      stats[provider] = this.getStatus(provider);
    });
    return stats;
  }

  /**
   * Wait for all pending requests to complete
   */
  async waitForAll(): Promise<void> {
    const promises = Array.from(this.limiters.values()).map(limiter => 
      limiter.stop({ dropWaitingJobs: false })
    );
    await Promise.all(promises);
  }
} 