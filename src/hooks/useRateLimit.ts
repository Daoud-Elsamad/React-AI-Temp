import { useState, useEffect, useCallback } from 'react';
import { RateLimitHandler, RateLimitInfo } from '../lib/security';

export interface UseRateLimitOptions {
  provider?: string;
  onRateLimit?: (info: RateLimitInfo) => void;
  onRateLimitReset?: () => void;
  retryDelay?: number;
}

export interface UseRateLimitReturn {
  rateLimitInfo: RateLimitInfo | null;
  isRateLimited: boolean;
  retryAfter: number;
  canRetry: boolean;
  handleRateLimitError: (error: any, headers?: Record<string, string>) => void;
  resetRateLimit: () => void;
  formatMessage: () => string;
}

export function useRateLimit(options: UseRateLimitOptions = {}): UseRateLimitReturn {
  const {
    onRateLimit,
    onRateLimitReset,
    retryDelay = 1000
  } = options;

  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null);
  const [retryAfter, setRetryAfter] = useState(0);

  // Countdown timer for retry delay
  useEffect(() => {
    if (retryAfter <= 0) return;

    const interval = setInterval(() => {
      setRetryAfter(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [retryAfter]);

  // Handle rate limit errors
  const handleRateLimitError = useCallback((error: any, headers?: Record<string, string>) => {
    const info = RateLimitHandler.parseRateLimitInfo(error, headers);
    setRateLimitInfo(info);

    if (info.isLimited) {
      const delay = info.retryAfter || Math.ceil(retryDelay / 1000);
      setRetryAfter(delay);
      onRateLimit?.(info);
    } else {
      setRetryAfter(0);
    }
  }, [retryDelay, onRateLimit]);

  // Reset rate limit state
  const resetRateLimit = useCallback(() => {
    setRateLimitInfo(null);
    setRetryAfter(0);
    onRateLimitReset?.();
  }, [onRateLimitReset]);

  // Format user-friendly message
  const formatMessage = useCallback(() => {
    if (!rateLimitInfo) return '';
    return RateLimitHandler.formatRateLimitMessage(rateLimitInfo);
  }, [rateLimitInfo]);

  return {
    rateLimitInfo,
    isRateLimited: rateLimitInfo?.isLimited || false,
    retryAfter,
    canRetry: retryAfter === 0,
    handleRateLimitError,
    resetRateLimit,
    formatMessage
  };
}

// Hook for managing multiple provider rate limits
export interface UseMultiProviderRateLimitOptions {
  providers: string[];
  onAnyRateLimit?: (provider: string, info: RateLimitInfo) => void;
  onAllReset?: () => void;
}

export function useMultiProviderRateLimit(options: UseMultiProviderRateLimitOptions) {
  const { onAnyRateLimit, onAllReset } = options;
  
  const [providerStates, setProviderStates] = useState<Record<string, RateLimitInfo>>({});
  const [retryTimers, setRetryTimers] = useState<Record<string, number>>({});

  // Update provider state
  const updateProviderState = useCallback((provider: string, info: RateLimitInfo) => {
    setProviderStates(prev => ({ ...prev, [provider]: info }));
    
    if (info.isLimited) {
      const delay = info.retryAfter || 60;
      setRetryTimers(prev => ({ ...prev, [provider]: delay }));
      onAnyRateLimit?.(provider, info);
    } else {
      setRetryTimers(prev => {
        const updated = { ...prev };
        delete updated[provider];
        return updated;
      });
    }
  }, [onAnyRateLimit]);

  // Handle rate limit error for specific provider
  const handleProviderError = useCallback((provider: string, error: any, headers?: Record<string, string>) => {
    const info = RateLimitHandler.parseRateLimitInfo(error, headers);
    updateProviderState(provider, info);
  }, [updateProviderState]);

  // Reset specific provider
  const resetProvider = useCallback((provider: string) => {
    setProviderStates(prev => {
      const updated = { ...prev };
      delete updated[provider];
      return updated;
    });
    setRetryTimers(prev => {
      const updated = { ...prev };
      delete updated[provider];
      return updated;
    });
  }, []);

  // Reset all providers
  const resetAll = useCallback(() => {
    setProviderStates({});
    setRetryTimers({});
    onAllReset?.();
  }, [onAllReset]);

  // Check if any provider is rate limited
  const isAnyRateLimited = Object.values(providerStates).some(info => info.isLimited);

  // Get rate limited providers
  const rateLimitedProviders = Object.entries(providerStates)
    .filter(([_, info]) => info.isLimited)
    .map(([provider, info]) => ({
      provider,
      info,
      retryAfter: retryTimers[provider] || 0
    }));

  // Timer effect for all providers
  useEffect(() => {
    const intervals: NodeJS.Timeout[] = [];

    Object.entries(retryTimers).forEach(([provider, time]) => {
      if (time > 0) {
        const interval = setInterval(() => {
          setRetryTimers(prev => {
            const current = prev[provider];
            if (current <= 1) {
              clearInterval(interval);
              const updated = { ...prev };
              delete updated[provider];
              return updated;
            }
            return { ...prev, [provider]: current - 1 };
          });
        }, 1000);
        intervals.push(interval);
      }
    });

    return () => intervals.forEach(clearInterval);
  }, [retryTimers]);

  return {
    providerStates,
    retryTimers,
    isAnyRateLimited,
    rateLimitedProviders,
    handleProviderError,
    resetProvider,
    resetAll,
    updateProviderState
  };
}

// Hook for automatic retry with exponential backoff
export interface UseRetryWithBackoffOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  multiplier?: number;
  onRetry?: (attempt: number) => void;
  onMaxRetriesReached?: () => void;
}

export function useRetryWithBackoff(options: UseRetryWithBackoffOptions = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    multiplier = 2,
    onRetry,
    onMaxRetriesReached
  } = options;

  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [nextRetryIn, setNextRetryIn] = useState(0);

  const calculateDelay = useCallback((attempt: number) => {
    const delay = Math.min(initialDelay * Math.pow(multiplier, attempt), maxDelay);
    // Add jitter to prevent thundering herd
    return delay + Math.random() * 1000;
  }, [initialDelay, multiplier, maxDelay]);

  const retry = useCallback(async (fn: () => Promise<any>) => {
    if (retryCount >= maxRetries) {
      onMaxRetriesReached?.();
      return null;
    }

    setIsRetrying(true);
    const delay = calculateDelay(retryCount);
    setNextRetryIn(Math.ceil(delay / 1000));

    // Countdown timer
    const interval = setInterval(() => {
      setNextRetryIn(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    try {
      await new Promise(resolve => setTimeout(resolve, delay));
      setRetryCount(prev => prev + 1);
      onRetry?.(retryCount + 1);
      
      const result = await fn();
      
      // Success - reset retry count
      setRetryCount(0);
      setIsRetrying(false);
      setNextRetryIn(0);
      clearInterval(interval);
      
      return result;
    } catch (error) {
      clearInterval(interval);
      setIsRetrying(false);
      setNextRetryIn(0);
      throw error;
    }
  }, [retryCount, maxRetries, calculateDelay, onRetry, onMaxRetriesReached]);

  const reset = useCallback(() => {
    setRetryCount(0);
    setIsRetrying(false);
    setNextRetryIn(0);
  }, []);

  const canRetry = retryCount < maxRetries && !isRetrying;

  return {
    retry,
    reset,
    retryCount,
    maxRetries,
    canRetry,
    isRetrying,
    nextRetryIn
  };
} 