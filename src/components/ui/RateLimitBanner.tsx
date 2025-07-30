import { useState, useEffect } from 'react';
import { Icon } from './Icon';
import { RateLimitHandler, RateLimitInfo } from '../../lib/security';

export interface RateLimitBannerProps {
  rateLimitInfo?: RateLimitInfo;
  provider?: string;
  className?: string;
  showWhenOk?: boolean;
  autoHide?: boolean;
  onRetry?: () => void;
}

export function RateLimitBanner({
  rateLimitInfo,
  provider = 'API',
  className = '',
  showWhenOk = false,
  autoHide = true,
  onRetry
}: RateLimitBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!rateLimitInfo?.isLimited) {
      if (autoHide && !showWhenOk) {
        const timer = setTimeout(() => setIsVisible(false), 3000);
        return () => clearTimeout(timer);
      }
      return;
    }

    // Set up countdown timer if retryAfter is provided
    if (rateLimitInfo.retryAfter) {
      setCountdown(rateLimitInfo.retryAfter);
      
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [rateLimitInfo, autoHide, showWhenOk]);

  if (!isVisible || !rateLimitInfo) return null;

  const getBannerStyle = () => {
    if (!rateLimitInfo.isLimited) {
      return 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200';
    }
    return 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200';
  };

  const getIcon = () => {
    if (!rateLimitInfo.isLimited) {
      return <Icon name="check" className="h-5 w-5 text-green-400" />;
    }
    return <Icon name="clock" className="h-5 w-5 text-yellow-400" />;
  };

  const formatCountdown = (seconds: number): string => {
    if (seconds <= 0) return '';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${seconds}s`;
  };

  const getTitle = () => {
    if (!rateLimitInfo.isLimited) {
      return `${provider} API - Operating Normally`;
    }
    return `${provider} Rate Limit Reached`;
  };

  const getMessage = () => {
    if (!rateLimitInfo.isLimited) {
      if (rateLimitInfo.requestsRemaining !== undefined) {
        return `${rateLimitInfo.requestsRemaining} requests remaining`;
      }
      return 'API requests are working normally';
    }
    
    return RateLimitHandler.formatRateLimitMessage(rateLimitInfo);
  };

  return (
    <div className={`rounded-lg border p-4 ${getBannerStyle()} ${className}`}>
      <div className="flex items-start">
        {getIcon()}
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium">
            {getTitle()}
          </h3>
          <div className="mt-1 text-sm">
            <p>{getMessage()}</p>
            
            {countdown > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs font-mono bg-white dark:bg-gray-800 px-2 py-1 rounded">
                  {formatCountdown(countdown)}
                </span>
                <span className="text-xs opacity-75">until retry</span>
              </div>
            )}
            
            {rateLimitInfo.windowReset && (
              <p className="text-xs mt-1 opacity-75">
                Limit resets at {rateLimitInfo.windowReset.toLocaleTimeString()}
              </p>
            )}
          </div>
          
          {rateLimitInfo.isLimited && onRetry && countdown === 0 && (
            <div className="mt-3">
              <button
                onClick={onRetry}
                className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-yellow-800 bg-yellow-100 hover:bg-yellow-200 dark:text-yellow-200 dark:bg-yellow-800 dark:hover:bg-yellow-700 transition-colors duration-200"
              >
                <Icon name="refresh" className="h-3 w-3 mr-1" />
                Try Again
              </button>
            </div>
          )}
        </div>
        
        <button
          onClick={() => setIsVisible(false)}
          className="ml-4 inline-flex text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
          aria-label="Dismiss"
        >
          <Icon name="x" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export interface RateLimitProgressProps {
  current: number;
  limit: number;
  label?: string;
  className?: string;
}

export function RateLimitProgress({
  current,
  limit,
  label = 'API Usage',
  className = ''
}: RateLimitProgressProps) {
  const percentage = Math.min((current / limit) * 100, 100);
  const remaining = Math.max(limit - current, 0);
  
  const getProgressColor = () => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getTextColor = () => {
    if (percentage >= 90) return 'text-red-600 dark:text-red-400';
    if (percentage >= 75) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between items-center text-sm">
        <span className="font-medium">{label}</span>
        <span className={`font-mono ${getTextColor()}`}>
          {remaining} / {limit} remaining
        </span>
      </div>
      
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      {percentage >= 90 && (
        <p className="text-xs text-red-600 dark:text-red-400">
          ⚠️ Approaching rate limit. Consider slowing down requests.
        </p>
      )}
    </div>
  );
}

export interface RateLimitStatusProps {
  providers: Array<{
    name: string;
    current: number;
    limit: number;
    resetTime?: Date;
    isLimited: boolean;
  }>;
  className?: string;
}

export function RateLimitStatus({ providers, className = '' }: RateLimitStatusProps) {
  if (providers.length === 0) return null;

  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
        API Rate Limits
      </h3>
      
      <div className="space-y-3">
        {providers.map((provider) => (
          <div key={provider.name} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{provider.name}</span>
              {provider.isLimited && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                  <Icon name="warning" className="h-3 w-3 mr-1" />
                  Limited
                </span>
              )}
            </div>
            
            <RateLimitProgress
              current={provider.current}
              limit={provider.limit}
              label=""
            />
            
            {provider.resetTime && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Resets at {provider.resetTime.toLocaleTimeString()}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 