import { CacheEntry, CacheConfig } from './types';

export class SimpleCache {
  private cache: Map<string, CacheEntry> = new Map();
  private config: CacheConfig;

  constructor(config: CacheConfig) {
    this.config = config;
    
    // Clean up expired entries periodically
    setInterval(() => this.cleanupExpired(), Math.min(config.ttl / 2, 60000));
  }

  /**
   * Generate cache key from request parameters
   */
  private generateKey(
    provider: string,
    method: string,
    params: Record<string, any>
  ): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((obj, key) => {
        obj[key] = params[key];
        return obj;
      }, {} as Record<string, any>);

    return `${provider}:${method}:${JSON.stringify(sortedParams)}`;
  }

  /**
   * Get cached response
   */
  get<T = any>(
    provider: string,
    method: string,
    params: Record<string, any>
  ): T | null {
    if (!this.config.enabled) {
      return null;
    }

    const key = this.generateKey(provider, method, params);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cached response
   */
  set<T = any>(
    provider: string,
    method: string,
    params: Record<string, any>,
    data: T,
    customTtl?: number
  ): void {
    if (!this.config.enabled) {
      return;
    }

    const key = this.generateKey(provider, method, params);
    const ttl = customTtl || this.config.ttl;

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl
    };

    // Implement simple LRU by removing oldest entries if we exceed max size
    if (this.cache.size >= (this.config.maxSize || 1000)) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, entry);
  }

  /**
   * Check if a response is cached
   */
  has(
    provider: string,
    method: string,
    params: Record<string, any>
  ): boolean {
    if (!this.config.enabled) {
      return false;
    }

    const key = this.generateKey(provider, method, params);
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize || 1000,
      enabled: this.config.enabled,
      ttl: this.config.ttl
    };
  }

  /**
   * Update cache configuration
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
} 