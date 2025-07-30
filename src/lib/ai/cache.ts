import { LRUCache } from 'lru-cache';
import { CacheEntry, CacheConfig } from './types';

export class AICache {
  private cache: LRUCache<string, CacheEntry>;
  private config: CacheConfig;

  constructor(config: CacheConfig) {
    this.config = config;
    this.cache = new LRUCache({
      max: config.maxSize || 1000,
      ttl: config.ttl,
      updateAgeOnGet: true,
      updateAgeOnHas: true
    });
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
   * Clear expired entries
   */
  clearExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((entry: CacheEntry, key: string) => {
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
      maxSize: this.cache.max,
      enabled: this.config.enabled,
      ttl: this.config.ttl
    };
  }

  /**
   * Update cache configuration
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Note: LRUCache properties are read-only, so we would need to recreate the cache
    // For now, we'll just update the config and the new settings will apply to new caches
  }
} 